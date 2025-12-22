import { Vector3, CatmullRomCurve3 } from 'three';
import { VehicleStats, TrackConfig, TrackCondition, ItemType } from './types.ts';
import { RNG } from './RNG.ts';
import { PhysicsConfig, DEFAULT_PHYSICS_CONFIG } from './EngineConfig.ts';

export interface CarConfig {
    id: string;
    stats: VehicleStats;
    isPlayer: boolean;
    startProgress?: number;
    horizontalOffset?: number;
    initialItem?: ItemType | null;
}

export interface RaceResult {
    rank: number;
    playerName: string;
    playerId: string;
    time: number;
}

export interface ActiveEffect {
    type: 'SpeedBoost' | 'Stun' | 'Invincible' | 'Shrink';
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
    
    // Physics state
    public currentSpeed: number = 0; // Unit: progress per second (approx)
    public lastCurvature: number = 0;
    private trackConfig: TrackConfig;
    private physicsConfig: PhysicsConfig;

    constructor(config: CarConfig, trackConfig?: TrackConfig, physicsConfig?: PhysicsConfig) {
        this.id = config.id;
        this.stats = config.stats;
        this.progress = config.startProgress || 0;
        this.isPlayer = config.isPlayer;
        this.horizontalOffset = config.horizontalOffset || 0;
        this.currentItem = config.initialItem || null;
        this.physicsConfig = physicsConfig || DEFAULT_PHYSICS_CONFIG;
        this.trackConfig = trackConfig || {
             condition: TrackCondition.ASPHALT,
             speedModifier: 1.0,
             handlingModifier: 1.0,
             gripModifier: 1.0,
             roadColor: 0x333333,
             grassColor: 0x006266,
             skyColor: 0x87CEEB
        };
    }

    addEffect(effect: ActiveEffect) {
         // Check immunities (Star)
        if (this.activeEffects.some(e => e.type === 'Invincible') && 
            ['Stun', 'Shrink'].includes(effect.type)) {
            return;
        }

        // Apply stat-based resistance to negative effects
        if (['Stun', 'Shrink'].includes(effect.type)) {
             // Mass 1-10. Higher mass = less duration.
             // Max reduction: 50% at mass 10.
             const resistance = (this.stats.mass || 1) / this.physicsConfig.massResistanceDivisor; 
             effect.duration *= (1 - resistance);
        }

        this.activeEffects.push(effect);
    }

    update(deltaTime: number, upcomingCurvature: number = 0) {
        if (this.finished) return;
        this.lastCurvature = upcomingCurvature;

        const deltaSeconds = deltaTime / 1000;

        // Process Effects
        this.activeEffects = this.activeEffects.filter(e => {
            e.duration -= deltaSeconds;
            return e.duration > 0;
        });

        const isStunned = this.activeEffects.some(e => e.type === 'Stun');
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
        
        let targetSpeed = (minMaxSpeed + (statSpeed / 2) * (maxMaxSpeed - minMaxSpeed)) * terrainModifier;

        // Apply SpeedBoost
        const boost = this.activeEffects.find(e => e.type === 'SpeedBoost');
        if (boost) {
            // Grip factor increases boost effectiveness (10% per point over 5)
            // Grip 1 -> 0.6x boost effect
            // Grip 5 -> 1.0x boost effect
            // Grip 10 -> 1.5x boost effect
            const gripBonus = this.physicsConfig.boostGripBonusBase + (statGrip / 10) * this.physicsConfig.boostGripBonusPerStat;
            targetSpeed *= (1 + boost.magnitude * gripBonus);
        }

        // Apply Shrink (Slow)
        const shrink = this.activeEffects.find(e => e.type === 'Shrink');
        if (shrink) {
            targetSpeed *= (1 - shrink.magnitude);
        }
        
        // Invincible increases speed slightly too
        const star = this.activeEffects.find(e => e.type === 'Invincible');
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
            let handlingFactor = 1.0 - (statHandling / this.physicsConfig.handlingMaxFactor); 
            
            // Grip also helps cornering now
            // Higher grip -> reduces handlingFactor further (up to gripCorneringEffect)
            // Grip 10 -> reduces factor by full effect. Grip 1 -> reduces by 10% of effect.
            const gripHelp = (statGrip / 10) * this.physicsConfig.gripCorneringEffect;
            handlingFactor = Math.max(0.1, handlingFactor - gripHelp);

            // Braking strength depends on curvature and handling
            // We reduce target speed based on how sharp the turn is
            const brakingStrength = upcomingCurvature * handlingFactor * this.physicsConfig.brakingStrengthMult;
            
            // Limit speed reduction (don't stop completely)
            const speedFactor = Math.max(this.physicsConfig.minCorneringSpeedFactor, 1.0 - brakingStrength);
            
            targetSpeed *= speedFactor;
        }

        // accel_curve 1-10 -> factor
        // Formula: current_speed += (max_velocity - current_speed) * acceleration_factor * delta_time
        // acceleration_factor needs to be tuned. Let's say 0.5 to 2.0
        let accelFactor = this.physicsConfig.baseAccel + (statAccel / 10) * this.physicsConfig.accelPerStat;
        
        if (boost) accelFactor *= 2.0;

        // Deceleration is faster than acceleration (braking)
        // Mass reduces deceleration (momentum/coasting)
        // Mass 10 -> reduces decelMult effectively
        const massCoasting = (this.stats.mass || 5) * this.physicsConfig.massDecelReduction;
        // Ensure we don't reduce decel to 0 or below (minimum 1.0x accel)
        const effectiveDecelMult = Math.max(1.0, this.physicsConfig.decelMult - massCoasting);

        const decelFactor = accelFactor * effectiveDecelMult;
        
        // Apply acceleration or deceleration
        if (targetSpeed < this.currentSpeed) {
             this.currentSpeed += (targetSpeed - this.currentSpeed) * decelFactor * deltaSeconds;
        } else {
             this.currentSpeed += (targetSpeed - this.currentSpeed) * accelFactor * deltaSeconds;
        }
        
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
    private trackConfig: TrackConfig | undefined;
    private physicsConfig: PhysicsConfig;

    constructor(trackPoints: Vector3[], laps: number, trackConfig?: TrackConfig, physicsConfig?: PhysicsConfig) {
        this.curve = new CatmullRomCurve3(trackPoints);
        this.curve.closed = true;
        this.curve.tension = 0.5;
        this.totalLaps = laps;
        this.trackConfig = trackConfig;
        this.physicsConfig = physicsConfig || DEFAULT_PHYSICS_CONFIG;
    }
    
    // ... (rest of class methods, make sure to pass physicsConfig to SimCar in start())

    private getCurvatureAt(t: number, lookAhead: number = 0.05): number {
        // Calculate angle change over a short segment ahead
        const t1 = (t + lookAhead) % 1;
        const t2 = (t + lookAhead + 0.02) % 1; // Look slightly further to get tangent change
        
        // Fix for negative wrapping if needed (though t is usually positive)
        const u1 = (t1 < 0 ? t1 + 1 : t1);
        const u2 = (t2 < 0 ? t2 + 1 : t2);

        const tan1 = this.curve.getTangentAt(u1).normalize();
        const tan2 = this.curve.getTangentAt(u2).normalize();
        
        // Angle in radians
        const angle = tan1.angleTo(tan2);
        
        // Normalize by distance (approximation)
        // If distance is constant (0.02), angle itself is proportional to curvature
        return angle;
    }

    public start(carConfigs: CarConfig[]) {
        this.cars = carConfigs.map(c => new SimCar(c, this.trackConfig, this.physicsConfig));
        this.time = 0;
        this.results = [];
        this.snapshots = [];
    }

    private getCarRank(carId: string): number {
        // Sort cars by position (lap + progress) descending
        const sortedCars = [...this.cars].sort((a, b) => {
            const distA = a.lap + a.progress;
            const distB = b.lap + b.progress;
            return distB - distA;
        });
        return sortedCars.findIndex(c => c.id === carId);
    }

    public useItem(carId: string) {
        const car = this.cars.find(c => c.id === carId);
        if (!car || !car.currentItem) return;

        // Don't allow using item if an effect is active
        if (car.activeEffects.length > 0) return;

        const item = car.currentItem;
        car.currentItem = null; // Consume

        const totalCars = this.cars.length;
        const rank = this.getCarRank(carId);
        const rankFactor = totalCars > 1 ? rank / (totalCars - 1) : 0; // 0 (1st) to 1 (Last)

        // Apply Item Logic
        switch (item) {
            case 'Mushroom':
                // Positive: Stronger for lower ranks (higher rankIndex)
                // Base: 5s, 0.5 mag. Max: 10s, 1.0 mag.
                const boostDuration = 5.0 * (1 + rankFactor); 
                const boostMag = 0.5 * (1 + rankFactor);
                car.addEffect({ type: 'SpeedBoost', duration: boostDuration, magnitude: boostMag, label: 'Boost' });
                break;
            case 'Star':
                // Positive: Longer for lower ranks
                const starDuration = 5.0 * (1 + rankFactor);
                car.addEffect({ type: 'Invincible', duration: starDuration, magnitude: 0.2, label: 'Star' });
                // Also clears negatives
                car.activeEffects = car.activeEffects.filter(e => !['Stun', 'Shrink'].includes(e.type));
                break;
            case 'Red Shell':
                // Find target (next car ahead)
                const target = this.findTarget(car);
                if (target) {
                    const targetRank = this.getCarRank(target.id);
                    const targetRankFactor = totalCars > 1 ? targetRank / (totalCars - 1) : 0;
                    // Negative: Stronger against leaders (lower rankIndex)
                    // 1st place (0) -> 100% effect. Last place (1) -> 20% effect.
                    const shellDuration = 2.0 * (1 - targetRankFactor * 0.8);
                    target.addEffect({ type: 'Stun', duration: shellDuration, magnitude: 1.0, label: 'Hit' });
                }
                break;
            case 'Lightning':
                // All opponents
                this.cars.forEach(c => {
                    if (c !== car) {
                         const cRank = this.getCarRank(c.id);
                         const cRankFactor = totalCars > 1 ? cRank / (totalCars - 1) : 0;
                         // Negative: Stronger against leaders
                         const shockDuration = 4.0 * (1 - cRankFactor * 0.8);
                         c.addEffect({ type: 'Shrink', duration: shockDuration, magnitude: 0.4, label: 'Shrunk' });
                    }
                });
                break;
            case 'Banana':
                // For simplicity, check if any car is close behind
                this.checkBananaHit(car);
                break;
        }
    }

    private findTarget(source: SimCar): SimCar | undefined {
        // Find closest car ahead
        let minDist = Infinity;
        let target: SimCar | undefined;

        this.cars.forEach(other => {
            if (other === source || other.finished) return;
            
            // Calculate distance ahead
            let dist = (other.lap + other.progress) - (source.lap + source.progress);
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
         this.cars.forEach(other => {
             if (other === source) return;
             // Distance behind
             let dist = (source.lap + source.progress) - (other.lap + other.progress);
             
             // If car is within 0.1 progress units behind (approx 10% of track)
             if (dist > 0 && dist < 0.1) {
                  // Hit!
                  const rank = this.getCarRank(other.id);
                  const rankFactor = totalCars > 1 ? rank / (totalCars - 1) : 0;
                  // Negative: Stronger against leaders
                  const duration = 1.5 * (1 - rankFactor * 0.8);
                  other.addEffect({ type: 'Stun', duration: duration, magnitude: 1.0, label: 'Slip' });
             }
         });
    }

    public update(deltaTime: number) {
        // Update cars
        const carsFinishingThisFrame: SimCar[] = [];
        
        this.cars.forEach(car => {
            if (!car.finished) {
                // Calculate upcoming curvature
                // Look ahead distance could scale with speed, but constant is fine for now
                const lookAhead = 0.02 + car.currentSpeed * 0.5; // Look ahead ~0.5s
                const curvature = this.getCurvatureAt(car.progress, lookAhead);

                car.update(deltaTime, curvature);
                
                // Bot Logic: Randomly use item if they have one
                if (car.currentItem) {
                    // 1% chance per frame (at 60fps -> ~50% per second)
                    if (RNG.next() < 0.001) {
                        this.useItem(car.id);
                    }
                }

                if (car.lap > this.totalLaps) {
                    car.finished = true;
                    car.finishTime = this.time;
                    carsFinishingThisFrame.push(car);
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
        carsFinishingThisFrame.forEach(car => {
            this.results.push({
                rank: this.results.length + 1,
                playerName: car.isPlayer ? "Player" : "Bot",
                playerId: car.id,
                time: this.time
            });
        });

        this.time += deltaTime;
    }

    public getSnapshot(): GameSnapshot {
        return {
            time: this.time,
            cars: this.cars.map(c => ({
                id: c.id,
                progress: c.progress,
                lap: c.lap,
                finished: c.finished,
                finishTime: c.finishTime,
                activeEffects: c.activeEffects.map(e => ({...e})),
                currentItem: c.currentItem
            }))
        };
    }

    public run(carConfigs: CarConfig[]): SimulationResult {
        this.start(carConfigs);
        
        const dt = 16.66; // 60fps simulation step
        const maxTime = 600000; // 10 minutes max to prevent infinite loops

        while (this.cars.some(c => !c.finished) && this.time < maxTime) {
            this.update(dt);

            // Snapshot every 1 second roughly (every 60 frames)
            if (Math.floor(this.time / dt) % 60 === 0) {
                 this.snapshots.push(this.getSnapshot());
            }
        }

        return { results: this.results, snapshots: this.snapshots };
    }
    
    public getCars(): SimCar[] {
        return this.cars;
    }
}
