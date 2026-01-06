import { CatmullRomCurve3, Vector3 } from "three";
import {
  ItemType,
  TrackCondition,
  TrackConfig,
  VehicleStats,
} from "./types.ts";
import { RNG } from "./RNG.ts";
import { DEFAULT_PHYSICS_CONFIG, PhysicsConfig } from "./EngineConfig.ts";
import { CarBase } from "./CartBase.ts";
import { PlayerConfig } from "./types.ts";

export interface CarConfig {
  id: string;
  stats: VehicleStats;
  isPlayer: boolean;
  startProgress?: number;
  horizontalOffset?: number;
  initialItem?: ItemType | null; // Deprecated: use itemSequence instead
  itemSequence?: ItemType[]; // Sequence of items for this car (10 items)
}

export interface RaceResult {
  rank: number;
  playerName: string;
  playerId: string;
  time: number;
}

export interface ActiveEffect {
  type: "SpeedBoost" | "Stun" | "Invincible" | "Shrink";
  duration: number; // seconds
  magnitude: number;
  label: string;
}

export interface CarState {
  id: string;
  progress: number;
  lap: number;
  finished: boolean;
  finishTime: number;
  activeEffects: ActiveEffect[];
  currentItem: ItemType | null;
}

export interface GameSnapshot {
  time: number;
  cars: CarState[];
}

export interface SimulationResult {
  results: RaceResult[];
  snapshots: GameSnapshot[];
}

export class SimCar {
  public id: string;
  public stats: VehicleStats;
  public progress: number;
  public lap: number = 1;
  public finished: boolean = false;
  public finishTime: number = 0;
  public isPlayer: boolean;
  public horizontalOffset: number = 0;
  public currentItem: ItemType | null = null;
  public activeEffects: ActiveEffect[] = [];
  public itemSequence: ItemType[] = []; // Sequence of items for this car
  public itemSequenceIndex: number = 0; // Current index in the item sequence

  // Physics state
  public currentSpeed: number = 0; // Unit: progress per second (approx)
  public lastCurvature: number = 0;
  private trackConfig: TrackConfig;
  private physicsConfig: PhysicsConfig;
  private maxSpeedProgressPerSecond: number;

  constructor(
    config: CarConfig,
    trackConfig: TrackConfig,
    physicsConfig?: PhysicsConfig,
    maxSpeedProgressPerSecond?: number,
  ) {
    this.id = config.id;
    this.stats = config.stats;
    this.progress = config.startProgress || 0;
    this.isPlayer = config.isPlayer;
    this.horizontalOffset = config.horizontalOffset || 0;
    this.itemSequence = config.itemSequence || [];
    this.itemSequenceIndex = 0;
    this.currentItem = this.itemSequence.length > 0 ? this.itemSequence[0] : null;
    this.physicsConfig = physicsConfig || DEFAULT_PHYSICS_CONFIG;
    this.trackConfig = trackConfig;
    this.maxSpeedProgressPerSecond = maxSpeedProgressPerSecond || Infinity;
  }

  addEffect(effect: ActiveEffect) {
    // Check immunities (Star)
    if (
      this.activeEffects.some((e) => e.type === "Invincible") &&
      ["Stun", "Shrink"].includes(effect.type)
    ) {
      return;
    }

    // Apply stat-based resistance to negative effects
    if (["Stun", "Shrink"].includes(effect.type)) {
      // Mass 1-10. Higher mass = less duration.
      // Max reduction: 50% at mass 10.
      const resistance = (this.stats.mass || 1) /
        this.physicsConfig.massResistanceDivisor;
      effect.duration *= 1 - resistance;
    }

    this.activeEffects.push(effect);
  }

  update(deltaTime: number, upcomingCurvature: number = 0) {
    if (this.finished) return;
    this.lastCurvature = upcomingCurvature;

    const deltaSeconds = deltaTime / 1000;

    // Process Effects
    this.activeEffects = this.activeEffects.filter((e) => {
      e.duration -= deltaSeconds;
      return e.duration > 0;
    });

    const isStunned = this.activeEffects.some((e) => e.type === "Stun");
    if (isStunned) {
      this.currentSpeed = 0;
      return;
    }

    // Normalize stats
    const statSpeed = this.stats.max_velocity;
    const statAccel = this.stats.accel_curve;
    const statHandling = this.stats.turn_radius;
    const statGrip = this.stats.grip_factor;

    // Map stats 1-10 to physics values
    // max_velocity 1-10 -> 0.05 to 0.25 (progress per second)
    const minMaxSpeed = this.physicsConfig.minMaxSpeed;
    const maxMaxSpeed = this.physicsConfig.maxMaxSpeed;
    // Apply Terrain Speed Modifier to Max Speed
    const terrainModifier = this.trackConfig.speedModifier;

    // Grip factor has dramatic effect: <5 can't win, 5=~5% win, >5 always wins
    // Apply grip as a multiplier on max speed: <5 severely limits, 5=normal, >5 boosts significantly
    let gripMultiplier = 1.0;
    if (statGrip < 5) {
      // <5: Severely limits speed (can't win)
      // 1->0.3x, 4->0.7x
      gripMultiplier = 0.3 + ((statGrip - 1) / 3) * 0.4;
    } else if (statGrip === 5) {
      // 5: Standard (normal performance, ~5% win rate in balanced races)
      gripMultiplier = 1.0;
    } else {
      // >5: Significant boost (always wins)
      // 6->1.3x, 10->2.0x
      gripMultiplier = 1.0 + ((statGrip - 5) / 5) * 1.0;
    }

    // Calculate base target speed from stats
    const baseTargetSpeed =
      (minMaxSpeed + (statSpeed / 2) * (maxMaxSpeed - minMaxSpeed)) *
      terrainModifier * gripMultiplier;

    // Apply SpeedBoost (multiplicative modifier to base speed)
    const boost = this.activeEffects.find((e) => e.type === "SpeedBoost");
    let speedMultiplier = 1.0;
    if (boost) {
      // Grip factor increases boost effectiveness (10% per point over 5)
      // Grip 1 -> 0.6x boost effect
      // Grip 5 -> 1.0x boost effect
      // Grip 10 -> 1.5x boost effect
      const gripBonus = this.physicsConfig.boostGripBonusBase +
        (statGrip / 10) * this.physicsConfig.boostGripBonusPerStat;
      speedMultiplier = 1 + boost.magnitude * gripBonus;
    }

    // Apply Shrink (Slow) - reduces speed multiplier
    const shrink = this.activeEffects.find((e) => e.type === "Shrink");
    if (shrink) {
      speedMultiplier *= 1 - shrink.magnitude;
    }

    let targetSpeed = baseTargetSpeed * speedMultiplier;

    // Invincible increases speed slightly too
    const star = this.activeEffects.find((e) => e.type === "Invincible");
    if (star) {
      // targetSpeed *= 1.2;
    }

    // Apply braking based on curvature
    // Higher curvature = more braking needed
    // Higher handling = less braking needed (better cornering)
    // We only brake if curvature > threshold
    if (upcomingCurvature > this.physicsConfig.handlingCurveThreshold) {
      // Handling factor: 1 (bad) -> 1.0 multiplier for braking effect
      // Handling 10 (good) -> 0.1 multiplier for braking effect
      let handlingFactor = 1.0 -
        (statHandling / this.physicsConfig.handlingMaxFactor);

      // Grip also helps cornering now
      // Higher grip -> reduces handlingFactor further (up to gripCorneringEffect)
      // Grip 10 -> reduces factor by full effect. Grip 1 -> reduces by 10% of effect.
      const gripHelp = (statGrip / 10) *
        this.physicsConfig.gripCorneringEffect;
      handlingFactor = Math.max(0.1, handlingFactor - gripHelp);

      // Braking strength depends on curvature and handling
      // We reduce target speed based on how sharp the turn is
      const brakingStrength = upcomingCurvature * handlingFactor *
        this.physicsConfig.brakingStrengthMult;

      // Limit speed reduction (don't stop completely)
      const speedFactor = Math.max(
        this.physicsConfig.minCorneringSpeedFactor,
        1.0 - brakingStrength,
      );

      targetSpeed *= speedFactor;
    }

    // accel_curve 1-10 -> factor
    // Formula: current_speed += (max_velocity - current_speed) * acceleration_factor * delta_time
    // 5 is standard, <5 is worse, >5 is better
    // Map: 1->0.5x, 5->1.0x, 10->2.0x
    let accelMultiplier: number;
    if (statAccel <= 5) {
      // 1->0.5x, 5->1.0x (linear interpolation)
      accelMultiplier = 0.5 + ((statAccel - 1) / 4) * 0.5;
    } else {
      // 5->1.0x, 10->2.0x (linear interpolation)
      accelMultiplier = 1.0 + ((statAccel - 5) / 5) * 1.0;
    }
    let accelFactor = this.physicsConfig.baseAccel * accelMultiplier;

    if (boost) accelFactor *= this.physicsConfig.boostAccelMultiplier;

    // Deceleration is faster than acceleration (braking)
    // Mass reduces deceleration (momentum/coasting)
    // Mass 10 -> reduces decelMult effectively
    const massCoasting = (this.stats.mass || 5) *
      this.physicsConfig.massDecelReduction;
    // Ensure we don't reduce decel to 0 or below (minimum 1.0x accel)
    const effectiveDecelMult = Math.max(
      1.0,
      this.physicsConfig.decelMult - massCoasting,
    );

    const decelFactor = accelFactor * effectiveDecelMult;

    // Apply acceleration or deceleration
    if (targetSpeed < this.currentSpeed) {
      this.currentSpeed += (targetSpeed - this.currentSpeed) *
        decelFactor * deltaSeconds;
    } else {
      this.currentSpeed += (targetSpeed - this.currentSpeed) *
        accelFactor * deltaSeconds;
    }

    // Cap speed at 180 KM/H
    this.currentSpeed = Math.min(
      this.currentSpeed,
      this.maxSpeedProgressPerSecond,
    );

    // Apply movement
    this.progress += this.currentSpeed * deltaSeconds;

    if (this.progress >= 1) {
      this.progress -= 1;
      this.lap++;
    }
  }
}

export class GameSimulator {
  private curve: CatmullRomCurve3;
  private totalLaps: number;
  public cars: SimCar[] = [];
  public time: number = 0;
  public results: RaceResult[] = [];
  public snapshots: GameSnapshot[] = [];
  public stepSnapshots: GameSnapshot[] = []; // Store snapshot after every update for step-by-step comparison
  private trackConfig: TrackConfig;
  private physicsConfig: PhysicsConfig;
  private maxSpeedProgressPerSecond: number; // Capped at 180 KM/H
  private trackLength: number; // Cached track length in meters
  private rng: RNG;
  public updateCallCount: number = 0; // Debug: track number of update calls
  private debugLabel: string = ""; // For distinguishing logs between simulations
  private enableDebugLogs: boolean = false; // Enable/disable debug logging
  private readonly FIXED_STEP: number = 16.66; // Fixed timestep in milliseconds (60fps)

  constructor(
    trackPoints: Vector3[],
    laps: number,
    trackConfig: TrackConfig,
    physicsConfig: PhysicsConfig | undefined,
    rnd: RNG,
    debugLabel?: string,
    enableDebugLogs?: boolean,
  ) {
    this.curve = new CatmullRomCurve3(trackPoints);
    this.curve.closed = true;
    this.curve.tension = 0.5;
    this.totalLaps = laps;
    this.trackConfig = trackConfig;
    this.physicsConfig = physicsConfig || DEFAULT_PHYSICS_CONFIG;
    this.rng = rnd;
    this.debugLabel = debugLabel || "";
    this.enableDebugLogs = enableDebugLogs || false;

    // Calculate track length and convert 200 KM/H to progress per second
    this.trackLength = this.calculateTrackLength();
    const maxSpeedKmh = 200;
    const maxSpeedMs = (maxSpeedKmh * 1000) / 3600; // Convert KM/H to m/s
    this.maxSpeedProgressPerSecond = maxSpeedMs / this.trackLength; // Convert to progress per second
  }

  private calculateTrackLength(): number {
    // Sample the curve at high resolution to calculate approximate length
    const samples = 1000;
    let length = 0;
    let prevPoint = this.curve.getPointAt(0);

    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const point = this.curve.getPointAt(t);
      length += prevPoint.distanceTo(point);
      prevPoint = point;
    }

    return length; // Length in meters (assuming Three.js units are meters)
  }

  /**
   * Converts speed from progress per second to real KM/H
   * @param progressPerSecond Speed in progress per second
   * @returns Speed in KM/H
   */
  public convertSpeedToKmh(progressPerSecond: number): number {
    const metersPerSecond = progressPerSecond * this.trackLength;
    const kmh = metersPerSecond * 3.6; // Convert m/s to km/h
    return kmh;
  }

  // ... (rest of class methods, make sure to pass physicsConfig to SimCar in start())

  private getCurvatureAt(t: number, lookAhead: number = 0.05): number {
    // Calculate angle change over a short segment ahead
    const t1 = (t + lookAhead) % 1;
    const t2 = (t + lookAhead + 0.02) % 1; // Look slightly further to get tangent change

    // Fix for negative wrapping if needed (though t is usually positive)
    const u1 = t1 < 0 ? t1 + 1 : t1;
    const u2 = t2 < 0 ? t2 + 1 : t2;

    const tan1 = this.curve.getTangentAt(u1).normalize();
    const tan2 = this.curve.getTangentAt(u2).normalize();

    // Angle in radians
    const angle = tan1.angleTo(tan2);

    // Normalize by distance (approximation)
    // If distance is constant (0.02), angle itself is proportional to curvature
    return angle;
  }

  public start(carConfigs: CarConfig[]) {
    this.cars = carConfigs.map((c) =>
      new SimCar(
        c,
        this.trackConfig,
        this.physicsConfig,
        this.maxSpeedProgressPerSecond,
      )
    );
    this.time = 0;
    this.results = [];
    this.stepSnapshots = []; // Clear step snapshots
    this.snapshots = [];
    this.updateCallCount = 0; // Reset update call count
  }

  private getCarRank(carId: string): number {
    // Sort cars by position (lap + progress) descending
    const sortedCars = [...this.cars].sort((a, b) => {
      const distA = a.lap + a.progress;
      const distB = b.lap + b.progress;
      return distB - distA;
    });
    return sortedCars.findIndex((c) => c.id === carId);
  }

  public useItem(carId: string) {
    const car = this.cars.find((c) => c.id === carId);
    if (!car || !car.currentItem) return;

    // Don't allow using item if an effect is active
    if (car.activeEffects.length > 0) return;

    const item = car.currentItem;
    car.currentItem = null; // Consume current item
    
    // Assign next item from sequence
    car.itemSequenceIndex++;
    if (car.itemSequenceIndex < car.itemSequence.length) {
      car.currentItem = car.itemSequence[car.itemSequenceIndex];
    } else {
      car.currentItem = null; // No more items
    }

    const totalCars = this.cars.length;
    const rank = this.getCarRank(carId);
    const rankFactor = totalCars > 1 ? rank / (totalCars - 1) : 0; // 0 (1st) to 1 (Last)

    // Apply Item Logic
    switch (item) {
      case "Mushroom": {
        // Positive: Stronger for lower ranks (higher rankIndex)
        const boostDuration = this.physicsConfig.mushroomBaseDuration *
          (1 + rankFactor);
        const boostMag = this.physicsConfig.mushroomBaseMagnitude *
          (1 + rankFactor);
        car.addEffect({
          type: "SpeedBoost",
          duration: boostDuration,
          magnitude: boostMag,
          label: "Boost",
        });
        break;
      }
      case "Star": {
        // Positive: Longer for lower ranks
        const starDuration = this.physicsConfig.starBaseDuration *
          (1 + rankFactor);
        car.addEffect({
          type: "Invincible",
          duration: starDuration,
          magnitude: this.physicsConfig.starMagnitude,
          label: "Star",
        });
        // Also clears negatives
        car.activeEffects = car.activeEffects.filter((e) =>
          !["Stun", "Shrink"].includes(e.type)
        );
        break;
      }
      case "Red Shell": {
        // Find target (next car ahead)
        const target = this.findTarget(car);
        if (target) {
          const targetRank = this.getCarRank(target.id);
          const targetRankFactor = totalCars > 1
            ? targetRank / (totalCars - 1)
            : 0;
          // Negative: Stronger against leaders (lower rankIndex)
          const shellDuration = this.physicsConfig.redShellBaseDuration *
            (1 -
              targetRankFactor *
                this.physicsConfig.negativeEffectRankScaling);
          target.addEffect({
            type: "Stun",
            duration: shellDuration,
            magnitude: this.physicsConfig.redShellMagnitude,
            label: "Hit",
          });
        }
        break;
      }
      case "Lightning": {
        // All opponents
        this.cars.forEach((c) => {
          if (c !== car) {
            const cRank = this.getCarRank(c.id);
            const cRankFactor = totalCars > 1 ? cRank / (totalCars - 1) : 0;
            // Negative: Stronger against leaders
            const shockDuration = this.physicsConfig.lightningBaseDuration *
              (1 -
                cRankFactor *
                  this.physicsConfig
                    .negativeEffectRankScaling);
            c.addEffect({
              type: "Shrink",
              duration: shockDuration,
              magnitude: this.physicsConfig.lightningMagnitude,
              label: "Shrunk",
            });
          }
        });
        break;
      }
      case "Banana": {
        // For simplicity, check if any car is close behind
        this.checkBananaHit(car);
        break;
      }
    }
  }

  private findTarget(source: SimCar): SimCar | undefined {
    // Find closest car ahead
    let minDist = Infinity;
    let target: SimCar | undefined;

    this.cars.forEach((other) => {
      if (other === source || other.finished) return;

      // Calculate distance ahead
      let dist = (other.lap + other.progress) -
        (source.lap + source.progress);
      // Handle wrapping?
      // Simple approach: only check strict 'ahead' in race distance
      if (dist <= 0) return; // Behind or same

      if (dist < minDist) {
        minDist = dist;
        target = other;
      }
    });
    return target;
  }

  private checkBananaHit(source: SimCar) {
    const totalCars = this.cars.length;
    this.cars.forEach((other) => {
      if (other === source) return;
      // Distance behind
      let dist = (source.lap + source.progress) -
        (other.lap + other.progress);

      // If car is within hit distance threshold
      if (dist > 0 && dist < this.physicsConfig.bananaHitDistance) {
        // Hit!
        const rank = this.getCarRank(other.id);
        const rankFactor = totalCars > 1 ? rank / (totalCars - 1) : 0;
        // Negative: Stronger against leaders
        const duration = this.physicsConfig.bananaBaseDuration *
          (1 -
            rankFactor *
              this.physicsConfig.negativeEffectRankScaling);
        other.addEffect({
          type: "Stun",
          duration: duration,
          magnitude: this.physicsConfig.bananaMagnitude,
          label: "Slip",
        });
      }
    });
  }

  public update(deltaTime: number) {
    this.updateCallCount++; // Debug: track update calls
    
    // Debug logging for first 20 updates and every 100th update (only if enableDebugLogs is true)
    const shouldLog = this.enableDebugLogs && (this.updateCallCount <= 20 || this.updateCallCount % 100 === 0);
    const prefix = this.debugLabel ? `[${this.debugLabel}]` : "";
    if (shouldLog) {
      console.log(`${prefix}[Update ${this.updateCallCount}] time=${this.time.toFixed(2)}ms, deltaTime=${deltaTime.toFixed(2)}ms`);
    }
    
    // Update cars
    const carsFinishingThisFrame: SimCar[] = [];

    this.cars.forEach((car) => {
      if (!car.finished) {
        // Calculate upcoming curvature
        // Look ahead distance could scale with speed, but constant is fine for now
        const lookAhead = 0.02 + car.currentSpeed * 0.5; // Look ahead ~0.5s
        const curvature = this.getCurvatureAt(car.progress, lookAhead);

        car.update(deltaTime, curvature);

        // Bot Logic: Randomly use item if they have one (applies to ALL cars including player for deterministic simulation)
        if (car.currentItem) {
          const rngValue = this.rng.next();
          const chance = 0.01;
          if (shouldLog) {
            console.log(`${prefix}  [${car.id}] has item ${car.currentItem}, rng=${rngValue.toFixed(6)}, willUse=${rngValue < chance}`);
          }
          if (rngValue < chance) {
            if (this.enableDebugLogs) {
              console.log(`${prefix}[Update ${this.updateCallCount}] [${car.id}] USING ITEM ${car.currentItem} at time=${this.time.toFixed(2)}ms`);
            }
            this.useItem(car.id);
          }
        } else if (shouldLog && this.updateCallCount <= 100) {
          // Log when a car has no item (helps track when items were used)
          console.log(`${prefix}  [${car.id}] has no item`);
        }
        
        if (shouldLog && this.updateCallCount <= 20) {
          console.log(`${prefix}  [${car.id}] progress=${car.progress.toFixed(4)}, lap=${car.lap}, speed=${car.currentSpeed.toFixed(4)}`);
        }

        if (car.lap > this.totalLaps) {
          car.finished = true;
          car.finishTime = this.time;
          carsFinishingThisFrame.push(car);
          if (this.enableDebugLogs) {
            console.log(`${prefix}[${car.id}] FINISHED at time=${this.time.toFixed(2)}ms, updateCall=${this.updateCallCount}, progress=${car.progress.toFixed(4)}, lap=${car.lap}`);
          }
        }
      }
    });

    // Sort cars finishing this frame by position (lap + progress) to ensure fair ranking
    // If tied, maintain current order (which is already shuffled/randomized in calibration)
    carsFinishingThisFrame.sort((a, b) => {
      const distA = a.lap + a.progress;
      const distB = b.lap + b.progress;
      // Only sort if positions are meaningfully different
      if (Math.abs(distA - distB) < 0.0001) {
        // Positions are effectively tied - maintain array order (no swap)
        // This preserves the shuffled order from calibration setup
        return 0;
      }
      return distB - distA; // Higher position (further ahead) wins
    });

    // Add results in sorted order
    carsFinishingThisFrame.forEach((car) => {
      this.results.push({
        rank: this.results.length + 1,
        playerName: car.isPlayer ? "Player" : "Bot",
        playerId: car.id,
        time: this.time,
      });
    });

    // Calculate time deterministically from update count * FIXED_STEP
    // This ensures time is always exactly updateCallCount * FIXED_STEP, preventing floating point drift
    this.time = this.updateCallCount * this.FIXED_STEP;
    
    // Store snapshot after every update for step-by-step comparison
    this.stepSnapshots.push(this.getSnapshot());
  }

  public getSnapshot(): GameSnapshot {
    return {
      time: this.time,
      cars: this.cars.map((c) => ({
        id: c.id,
        progress: c.progress,
        lap: c.lap,
        finished: c.finished,
        finishTime: c.finishTime,
        activeEffects: c.activeEffects.map((e) => ({ ...e })),
        currentItem: c.currentItem,
      })),
    };
  }

  public run(carConfigs: CarConfig[]): SimulationResult {
    this.start(carConfigs);

    const maxTime = 600000; // 10 minutes max to prevent infinite loops

    while (this.cars.some((c) => !c.finished) && this.time < maxTime) {
      this.update(this.FIXED_STEP);

      // Snapshot every 1 second roughly (every 60 frames)
      if (this.updateCallCount % 60 === 0) {
        this.snapshots.push(this.getSnapshot());
      }
    }

    return { results: this.results, snapshots: this.snapshots };
  }

  public getCars(): SimCar[] {
    return this.cars;
  }
}

export function createCarsStats(
  playerConfig: PlayerConfig,
  rng: RNG,
): CarConfig[] {
  const carConfigs: CarConfig[] = [];

  // Player
  const playerCarId = "You";
  const playerCar = new CarBase(playerCarId, playerConfig.stats, true);
  const cars = [];
  cars.push(playerCar.getCarConfig());

  // Player Item Sequence (from playerConfig.items, sorted by slotIndex)
  const playerItemSequence: ItemType[] = [];
  if (playerConfig.items) {
    // Sort by slotIndex and extract item types
    const sortedItems = [...playerConfig.items].sort((a, b) => a.slotIndex - b.slotIndex);
    for (const item of sortedItems) {
      playerItemSequence.push(item.itemType);
    }
  }

  carConfigs.push({
    id: playerCarId,
    stats: playerConfig.stats,
    isPlayer: true,
    startProgress: 0,
    horizontalOffset: 0,
    itemSequence: playerItemSequence,
  });

  // Bots
  const colors = [
    0xff0000, // Racing Red
    0x222222, // Carbon Black
    0xffffff, // Pure White
    0x0055ff, // Electric Blue
    0xffa500, // Circuit Orange
    0x800080, // Royal Purple
    0x00ffcc, // Hyper Teal
    0x00ffff, // Cyan
    0xff00ff, // Magenta
    0x39ff14, // Neon Green
    0xffff00, // Laser Yellow
    0xff3131, // Neon Red
    0xbc13fe, // Neon Violet
  ];
  const names = [
    "Apex Predator",
    "Carbon X",
    "Velocity Prime",
    "Blue Streak",
    "Ignition",
    "Phantom Racer",
    "Neon Pulse",
    "Cyber Ghost",
    "Data Stream",
    "Flux Capacitor",
    "Neural Link",
    "Glitch",
    "Synth Wave",
  ];

  const NUMBER_OF_BOTS = 7;
  const allItems: ItemType[] = [
    "Mushroom",
    "Banana",
    "Red Shell",
    "Star",
    "Lightning",
  ];
  
  for (let i = 0; i < NUMBER_OF_BOTS; i++) {
    const botStats = generateBotStats(rng);
    const index = Math.floor(rng.next() * names.length);
    const botName = names[index];
    names.splice(index, 1);
    colors.splice(index, 1);
    const bot = new CarBase(botName, botStats, false);
    // Stagger start positions
    const startProgress = -0.02 * (i + 1);
    cars.push(bot);

    // Bot Random Item Sequence (10 items)
    const botItemSequence: ItemType[] = [];
    for (let j = 0; j < 10; j++) {
      const randomItem = allItems[Math.floor(rng.next() * allItems.length)];
      botItemSequence.push(randomItem);
    }

    // Simulator config
    carConfigs.push({
      id: botName,
      stats: botStats,
      isPlayer: false,
      startProgress: startProgress,
      horizontalOffset: 0,
      itemSequence: botItemSequence,
    });
  }
  return carConfigs;
}

function generateBotStats(rng: RNG): VehicleStats {
  const stats = [1, 1, 1, 1, 1];
  let budget = 25 - 5;

  while (budget > 0) {
    const idx = Math.floor(rng.next() * 5);
    if (stats[idx] < 10) {
      stats[idx]++;
      budget--;
    }
  }

  return {
    max_velocity: stats[0],
    accel_curve: stats[1],
    mass: stats[2],
    turn_radius: stats[3],
    grip_factor: stats[4],
    boost_efficiency: 5, // Default
  };
}
