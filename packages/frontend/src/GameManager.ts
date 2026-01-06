import * as THREE from "three";
import { Car } from "./models/Car.ts";
import { Circuit } from "./models/Circuit.ts";
import { TrackUtils } from "./simulation/TrackUtils.ts";
import { UIManager } from "./UIManager.ts";
import {
    ItemType,
    PlayerConfig,
    TrackConfig,
    // VehicleStats,
} from "./simulation/types.ts";
import { GhibliGrass } from "./GhibliGrass.ts";
import {
    CarConfig,
    createCarsStats,
    GameSimulator,
    RaceResult,
    GameSnapshot,
} from "./simulation/GameSimulator.ts";
import { EffectStreamService } from "./effectstream/EffectStreamService.ts";
import { createItemModel } from "./models/index.ts";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { CRTShader } from "./shaders/CRTShader.ts";
import { RNG } from "./simulation/RNG.ts";

const NUMBER_OF_BOTS = 7;
const DEBUG = false; // Set to true to run shared simulation and comparison logs

export class GameManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private composer: EffectComposer;
    private crtPass: ShaderPass;
    private circuit!: Circuit;
    private cars: Car[] = [];
    private playerCar: Car | null = null;
    private uiManager: UIManager;
    private lastTime: number = 0;
    private container: HTMLElement;
    private isRunning: boolean = false;
    private ghibliGrass: GhibliGrass | null = null;
    private simulator!: GameSimulator;
    private trackPoints!: THREE.Vector3[];
    private api: EffectStreamService;
    private trackConfig!: TrackConfig;
    // private currentConfig: PlayerConfig | null = null;
    private introGroup: THREE.Group | null = null;
    private introWrapper: THREE.Group | null = null;
    private introTime: number = 0;
    // private lastSlotIndex: number = -1;
    private hasPlayerFinished: boolean = false;
    private expectedResults: RaceResult[] | null = null; // Results from shared simulation
    private expectedStepSnapshots: GameSnapshot[] | null = null; // Step-by-step snapshots from shared simulation

    private keysPressed = new Set<string>();
    private clouds: THREE.Group[] = [];
    // private rng!: RNG;

    // Camera trailing system for smooth curves
    private trailingPosition: THREE.Vector3 = new THREE.Vector3();
    private trailingDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 1);

    private accumulator: number = 0;
    private readonly FIXED_STEP: number = 16.66; // Match shared simulation timestep

    private stringToHash(str: string): number {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    constructor(containerId: string, seed: number) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container ${containerId} not found`);
        this.container = container;

        // Initialize RNG
        // const initialSeed = seed;
        const rng = new RNG(seed);
        if (DEBUG) {
            console.log(`Game initialized with seed: ${seed}`);
        }

        this.api = new EffectStreamService();

        // UI Manager
        this.uiManager = new UIManager();
        this.bindUI();

        // Load initial leaderboard
        this.loadLeaderboard();

        // Generate Track Config (Initial)

        // Scene Setup
        this.scene = new THREE.Scene();
        // Fog/Background will be set in setupLevel
        this.setupLevel(rng);
        this.scene.background = new THREE.Color(this.trackConfig.skyColor);
        this.scene.fog = new THREE.Fog(this.trackConfig.skyColor, 20, 100);

        // Sky Elements
        this.createSky(rng);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000,
        );
        this.camera.position.set(0, 20, 20);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight,
        );
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.crtPass = new ShaderPass(CRTShader);
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const size = new THREE.Vector2(width, height);

        this.crtPass.uniforms["TextureSize"].value.copy(size);
        this.crtPass.uniforms["InputSize"].value.copy(size);
        this.crtPass.uniforms["OutputSize"].value.copy(size);

        this.composer.addPass(this.crtPass);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        this.scene.add(dirLight);

        // Track and Simulator are setup in setupLevel

        // Resize handler
        window.addEventListener("resize", () => this.onWindowResize());

        // Start Intro
        this.setupIntroScene();
        this.lastTime = performance.now();
        this.animate();
    }

    private setupIntroScene() {
        if (this.introWrapper) return;

        this.introTime = 0;

        // Wrapper for positioning and tilting
        this.introWrapper = new THREE.Group();
        this.scene.add(this.camera);
        this.camera.add(this.introWrapper);

        // Position wrapper in front of camera
        this.introWrapper.position.set(0, -2, -18);

        // Add 45 degree slope (tilt around X and Z for dynamic look)
        this.introWrapper.rotation.x = Math.PI / 6; // Tilt forward/back
        this.introWrapper.rotation.z = Math.PI / 4; // Tilt sideways (slope in Y)

        // Spinning group inside the wrapper
        this.introGroup = new THREE.Group();
        this.introWrapper.add(this.introGroup);

        const types: ItemType[] = [
            "Mushroom",
            "Banana",
            "Red Shell",
            "Star",
            "Lightning",
        ];
        const radius = 6;
        const count = types.length;

        types.forEach((type, i) => {
            const item = createItemModel(type);
            const angle = (i / count) * Math.PI * 2;
            item.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius,
            );
            item.scale.set(3, 3, 3);
            this.introGroup!.add(item);
        });
    }

    private teardownIntroScene() {
        if (this.introWrapper) {
            this.camera.remove(this.introWrapper);
            this.introWrapper = null;
            this.introGroup = null;
        }
    }

    private updateIntro(deltaTime: number) {
        this.introTime += deltaTime * 0.0002;

        if (this.introGroup) {
            this.introGroup.rotation.y += 0.0005 * deltaTime;
            this.introGroup.children.forEach((child: any) => {
                child.rotation.y += 0.002 * deltaTime;
            });
        }

        // Orbit camera
        const radius = 90;
        const height = 40;
        const x = Math.sin(this.introTime) * radius;
        const z = Math.cos(this.introTime) * radius;
        this.camera.position.set(x, height, z);
        this.camera.lookAt(0, 0, 0);
    }

    private async loadLeaderboard() {
        try {
            const response = await this.api.getLeaderboard();
            if (response.success && response.data) {
                this.uiManager.updateGlobalLeaderboard(response.data);
            }
        } catch (error) {
            console.error("Failed to load leaderboard:", error);
        }
    }

    private bindUI() {
        this.uiManager.onStartClick(() => {
            this.uiManager.initSetup();
        });

        this.uiManager.onPlayClick(() => {
            const config = this.uiManager.getPlayerConfiguration();
            this.startRace(config);
        });

        this.uiManager.onRestartClick(() => {
            this.resetGame();
        });

        // Key listeners
        window.addEventListener("keydown", (e) => {
            if (!this.isRunning || !this.playerCar) return;

            this.keysPressed.add(e.code);
        });

        window.addEventListener("keyup", (e) => {
            this.keysPressed.delete(e.code);
        });
    }

    private setupLevel(rng: RNG) {
        // Clean up old circuit if exists
        if (this.circuit) {
            this.circuit.dispose();
        }

        // Generate Track Config
        this.trackConfig = TrackUtils.generateTrackConfig(rng);
        if (DEBUG) {
            console.log("Track Config Generated:", this.trackConfig);
        }

        if (this.scene) {
            this.scene.background = new THREE.Color(this.trackConfig.skyColor);
            this.scene.fog = new THREE.Fog(this.trackConfig.skyColor, 20, 100);
        }

        // Track
        this.trackPoints = TrackUtils.generateRandomTrackPoints(rng);
        this.circuit = new Circuit(
            this.scene,
            this.trackPoints,
            this.trackConfig,
        );

        // Simulator
        this.simulator = new GameSimulator(
            this.trackPoints,
            3,
            this.trackConfig,
            undefined,
            rng,
            "VISUAL",
            DEBUG,
        );
    }

    /**
     * Runs the shared simulation (copied from packages/shared/simulation/src/runSimulation.ts)
     * This runs a headless simulation to get expected results for comparison
     */
    private runSharedSimulation(
        playerConfig: PlayerConfig,
        seed: number,
    ): RaceResult[] {
        const rng = new RNG(seed);
        const trackConfig = TrackUtils.generateTrackConfig(rng);
        const trackPoints = TrackUtils.generateRandomTrackPoints(rng);
        const simulator = new GameSimulator(
            trackPoints,
            3,
            trackConfig,
            undefined,
            rng,
            "SHARED",
            DEBUG,
        );
        const cars = createCarsStats(playerConfig, rng);
        
        console.log("=== SHARED SIMULATION INITIAL CONDITIONS ===");
        console.log("Seed:", seed);
        console.log("Track Config:", JSON.stringify(trackConfig, null, 2));
        console.log("Track Points Count:", trackPoints.length);
        const carsData = cars.map(c => ({
            id: c.id,
            isPlayer: c.isPlayer,
            stats: c.stats,
            startProgress: c.startProgress,
            itemSequence: c.itemSequence,
        }));
        console.log("Cars:", JSON.stringify(carsData, null, 2));
        
        simulator.start(cars);
        const results = simulator.run(cars);
        console.log("Shared simulation completed. Total time:", results.results[results.results.length - 1]?.time, "ms");
        console.log("Shared simulation update calls:", simulator.updateCallCount);
        console.log("Shared simulation results:", JSON.stringify(results.results, null, 2));
        console.log("Shared simulation step snapshots:", simulator.stepSnapshots.length);
        console.log("=== END SHARED SIMULATION INITIAL CONDITIONS ===");
        
        // Store step-by-step snapshots for comparison
        this.expectedStepSnapshots = simulator.stepSnapshots;
        console.log("Stored", this.expectedStepSnapshots.length, "step snapshots for comparison");
        
        return results.results;
    }

    private resetGame() {
        this.isRunning = false;
        // if (this.animationId) cancelAnimationFrame(this.animationId); // Don't stop loop

        // Remove old cars
        this.cars.forEach((c) => {
            this.scene.remove(c.mesh);
        });
        this.cars = [];
        this.playerCar = null;

        // Clean up grass
        if (this.ghibliGrass) {
            this.ghibliGrass.dispose();
            this.ghibliGrass = null;
        }

        this.uiManager.showScreen("start-screen");

        this.setupIntroScene();

        // Reload global leaderboard instead of clearing
        this.loadLeaderboard();
    }

    public async startRace(playerConfig: PlayerConfig) {
        if (DEBUG) {
            console.log("startRace called", playerConfig);
        }
        // this.currentConfig = playerConfig;

        // UI Loading State
        this.uiManager.setPlayButtonLoading(true);

        try {
            // Log login if not already (simulated)
            await this.api.login("Player");
        } catch (e) {
            console.warn("Login failed", e);
        }

        // Send play transaction to start race on-chain
        try {
            const playResponse = await this.api.play(
                playerConfig.stats,
                playerConfig.items,
            );
            if (!playResponse.success) {
                console.error("Failed to start race:", playResponse.error);
                alert(
                    "Failed to start race: " +
                        (playResponse.error || "Unknown error"),
                );
                this.uiManager.setPlayButtonLoading(false);
                return; // Stop race start
            } else if (playResponse.data) {
                const raceHash = playResponse.data; // Now string
                const seed = this.stringToHash(raceHash);
                if (DEBUG) {
                    console.log(`Using race hash ${raceHash} -> Seed ${seed}`);
                }

                // Run shared simulation for comparison (only if DEBUG is enabled)
                if (DEBUG) {
                    this.expectedResults = this.runSharedSimulation(
                        playerConfig,
                        seed,
                    );
                    console.log("Expected results from shared simulation:", this.expectedResults);
                } else {
                    this.expectedResults = null;
                    this.expectedStepSnapshots = null;
                }

                // Visual simulation uses a NEW RNG with the same seed (deterministic)
                const rng = new RNG(seed);
                
                if (DEBUG) {
                    console.log("=== VISUAL SIMULATION INITIAL CONDITIONS ===");
                    console.log("Seed:", seed);
                }
                
                this.setupLevel(rng);
                
                if (DEBUG) {
                    console.log("Track Config:", JSON.stringify(this.trackConfig, null, 2));
                    console.log("Track Points Count:", this.trackPoints.length);
                }
                
                const cars: CarConfig[] = createCarsStats(playerConfig, rng);
                
                if (DEBUG) {
                    const carsData = cars.map(c => ({
                        id: c.id,
                        isPlayer: c.isPlayer,
                        stats: c.stats,
                        startProgress: c.startProgress,
                        itemSequence: c.itemSequence,
                    }));
                    console.log("Cars:", JSON.stringify(carsData, null, 2));
                }
                
                const carConfigs = this.createCars(cars);
                this.simulator.start(carConfigs);
                // Reset accumulator to ensure deterministic timing
                this.accumulator = 0;
                
                if (DEBUG) {
                    console.log("=== END VISUAL SIMULATION INITIAL CONDITIONS ===");
                }
            }
        } catch (e: any) {
            console.error("Error sending play transaction:", e);
            alert("Network error: " + e.message);
            this.uiManager.setPlayButtonLoading(false);
            return; // Stop race start
        }

        // Success - Turn off loading but keep it ready for next time (or hide logic handles it)
        this.uiManager.setPlayButtonLoading(false);

        this.teardownIntroScene();
        // this.lastSlotIndex = -1;
        this.hasPlayerFinished = false;

        this.uiManager.hideAllScreens();

        // Create Grass
        if (this.playerCar) {
            const trackMask = this.circuit.getTrackMask();
            this.ghibliGrass = new GhibliGrass(
                this.scene,
                this.playerCar.mesh,
                trackMask,
            );
        }

        this.isRunning = true;
        this.lastTime = performance.now();

        this.animate(); // Loop is already running
    }

    // private generateBotStats(rng: RNG): VehicleStats {
    //     const stats = [1, 1, 1, 1, 1];
    //     let budget = 25 - 5;

    //     while (budget > 0) {
    //         const idx = Math.floor(rng.next() * 5);
    //         if (stats[idx] < 10) {
    //             stats[idx]++;
    //             budget--;
    //         }
    //     }

    //     return {
    //         max_velocity: stats[0],
    //         accel_curve: stats[1],
    //         mass: stats[2],
    //         turn_radius: stats[3],
    //         grip_factor: stats[4],
    //         boost_efficiency: 5, // Default
    //     };
    // }

    private createCars(cars: CarConfig[]) {
        const playerCar = cars.find((c) => c.isPlayer)!;
        const carConfigs: CarConfig[] = [];

        // Player
        this.playerCar = new Car(
            this.scene,
            this.circuit,
            playerCar.id,
            playerCar.stats,
            0xff0000,
            true,
        );
        this.cars.push(this.playerCar);

        // Reset trailing position for camera lag system (will be initialized on first camera update)
        this.trailingPosition.set(0, 0, 0);
        this.trailingDirection.set(0, 0, 1);

        carConfigs.push({
            id: playerCar.id,
            stats: playerCar.stats,
            isPlayer: true,
            startProgress: 0,
            horizontalOffset: 0,
            itemSequence: playerCar.itemSequence, // Include item sequence from createCarsStats
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

        const botCars = cars.filter((c) => !c.isPlayer);
        for (let i = 0; i < NUMBER_OF_BOTS; i++) {
            const botStats = botCars[i].stats;
            // Use the ID from createCarsStats (which was randomly selected) instead of sequential names
            const botName = botCars[i].id;
            // Find color index by matching the bot name in the original names array
            const nameIndex = names.indexOf(botName);
            const botColor = nameIndex >= 0 ? colors[nameIndex] : colors[i % colors.length];
            const bot = new Car(
                this.scene,
                this.circuit,
                botName,
                botStats,
                botColor,
            );
            // Stagger start positions
            // const startProgress = -0.02 * (i + 1);

            // Visual car setup
            bot.updateState(botCars[i].startProgress!, 1, false);
            this.cars.push(bot);

            // Bot Item Sequence (from createCarsStats)
            const botItemSequence = botCars[i].itemSequence || [];

            // Simulator config
            carConfigs.push({
                id: botName,
                stats: botStats,
                isPlayer: false,
                startProgress: botCars[i].startProgress,
                horizontalOffset: 0,
                itemSequence: botItemSequence,
            });
        }
        return carConfigs;
    }

    private updatePhysics(deltaTime: number) {
        // Step the simulator using fixed timestep (guarantees FIXED_STEP, not system clock)
        this.accumulator += deltaTime;
        let stepCount = 0;
        while (this.accumulator >= this.FIXED_STEP) {
            this.simulator.update(this.FIXED_STEP);
            this.accumulator -= this.FIXED_STEP;
            stepCount++;
            
            // Compare with expected snapshot at this step (only if DEBUG is enabled)
            // Note: updateCallCount is incremented at the start of update(), so after update N completes,
            // updateCallCount = N, and we've stored N snapshots (indices 0 to N-1)
            if (DEBUG && this.expectedStepSnapshots) {
                const snapshotIndex = this.simulator.updateCallCount - 1;
                if (snapshotIndex < this.expectedStepSnapshots.length) {
                    const expectedSnapshot = this.expectedStepSnapshots[snapshotIndex];
                    const actualSnapshot = this.simulator.getSnapshot();
                    
                    if (!this.compareSnapshots(expectedSnapshot, actualSnapshot, this.simulator.updateCallCount)) {
                        // Divergence detected - stop simulation
                        console.error(`❌ DIVERGENCE DETECTED at update ${this.simulator.updateCallCount}`);
                        this.isRunning = false;
                        break;
                    }
                } else {
                    console.warn(`⚠ More updates in visual simulation than expected (${this.simulator.updateCallCount} > ${this.expectedStepSnapshots.length})`);
                    this.isRunning = false;
                    break;
                }
            }
        }
        // Note: accumulator remainder (< FIXED_STEP) is preserved for next frame
        // This ensures we always use exactly FIXED_STEP for simulation steps

        // Update Circuit (Materials)
        this.circuit.update(deltaTime / 1000);

        // Sync visual cars with simulation state
        const simCars = this.simulator.getCars();

        this.cars.forEach((car) => {
            const simState = simCars.find((c) => c.id === car.id);
            if (simState) {
                car.updateState(
                    simState.progress,
                    simState.lap,
                    simState.finished,
                );
                if (simState.finished) {
                    car.finishTime = simState.finishTime;
                }
                // Sync visual effects
                car.updateVisualEffects(simState.activeEffects);
            }

            // Call deprecated update just in case there are visual-only updates
            car.update(deltaTime);
        });

        // Resolve visual collisions (Modify offsets for next frame)
        this.resolveVisualCollisions(deltaTime);

        // Handle Player Input (Steering)
        // this.handlePlayerInput(deltaTime);

        // Update Grass
        if (this.ghibliGrass) {
            // this.ghibliGrass.update(deltaTime / 1000);
        }
    }

    private resolveVisualCollisions(deltaTime: number) {
        const minLongitudinalDist = 0.04; // ~4% of track length
        const minLateralDist = 1.2; // Distance between centers to avoid
        const avoidSpeed = 0.005;
        const centeringSpeed = 0.002;
        const trackWidthLimit = 4.0;

        // Calculate intended moves first so order doesn't bias result too much
        const moves = new Map<string, number>();

        this.cars.forEach((car) => {
            let move = 0;
            const prog = car.getProgress();

            this.cars.forEach((other) => {
                if (car === other) return;

                const otherProg = other.getProgress();
                let delta = otherProg - prog;

                // Wrap around logic for circular track
                if (delta > 0.5) delta -= 1;
                if (delta < -0.5) delta += 1;

                // If 'other' is ahead (delta > 0) and close
                if (delta > 0 && delta < minLongitudinalDist) {
                    const latDist = other.horizontalOffset -
                        car.horizontalOffset;

                    if (Math.abs(latDist) < minLateralDist) {
                        // Collision risk. 'car' is behind 'other'. 'car' must shift.
                        // Shift away from 'other'
                        const dir = latDist >= 0 ? -1 : 1;
                        move += dir * avoidSpeed * deltaTime;
                    }
                }
            });
            moves.set(car.id, move);
        });

        // Apply moves
        this.cars.forEach((car) => {
            const move = moves.get(car.id) || 0;

            // If player is steering, collision avoidance might fight it.
            // For now, let collision avoidance sum with steering (handled in next frame or separate)
            // But here we apply automated moves.

            if (move !== 0) {
                car.horizontalOffset += move;
            } else {
                // Gently return to center if no conflict
                // Only if NOT player (let player control their lane)
                if (!car.isPlayer) {
                    if (Math.abs(car.horizontalOffset) > 0.1) {
                        car.horizontalOffset -=
                            Math.sign(car.horizontalOffset) * centeringSpeed *
                            deltaTime;
                    } else {
                        car.horizontalOffset = 0;
                    }
                } else {
                    // For player, maybe less centering or none?
                    // Let's keep it minimal for player so they can hold a lane
                    if (Math.abs(car.horizontalOffset) > 0.1) {
                        car.horizontalOffset -=
                            Math.sign(car.horizontalOffset) *
                            (centeringSpeed * 0.1) * deltaTime;
                    }
                }
            }

            // Clamp to track limits
            car.horizontalOffset = Math.max(
                -trackWidthLimit,
                Math.min(trackWidthLimit, car.horizontalOffset),
            );
        });
    }

    private createSky(rng: RNG) {
        // Sun
        // Align sun with directional light (10, 20, 10)
        const sunPos = new THREE.Vector3(10, 20, 10).normalize().multiplyScalar(
            800,
        );

        const sunGeometry = new THREE.SphereGeometry(60, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.copy(sunPos);
        this.scene.add(sun);

        // Clouds
        const cloudCount = 20;
        const cloudColor = 0xffffff;

        for (let i = 0; i < cloudCount; i++) {
            const cloudGroup = new THREE.Group();
            const cloudGeo = new THREE.SphereGeometry(20, 8, 8); // Scaled up
            const cloudMat = new THREE.MeshLambertMaterial({
                color: cloudColor,
                flatShading: true,
                transparent: true,
                opacity: 0.9,
            });

            // Create blobs
            const blobs = 3 + Math.floor(rng.next() * 5);
            for (let j = 0; j < blobs; j++) {
                const blob = new THREE.Mesh(cloudGeo, cloudMat);
                blob.position.set(
                    (rng.next() - 0.5) * 40,
                    (rng.next() - 0.5) * 20,
                    (rng.next() - 0.5) * 30,
                );
                const scale = 0.6 + rng.next() * 0.8;
                blob.scale.setScalar(scale);
                cloudGroup.add(blob);
            }

            // Position cloud
            const angle = rng.next() * Math.PI * 2;
            const dist = 600 + rng.next() * 300;
            const height = 200 + rng.next() * 200;

            cloudGroup.position.set(
                Math.cos(angle) * dist,
                height,
                Math.sin(angle) * dist,
            );

            // Random rotation
            cloudGroup.rotation.y = rng.next() * Math.PI * 2;

            this.scene.add(cloudGroup);
            this.clouds.push(cloudGroup);
        }
    }

    private updateSky(deltaTime: number) {
        this.clouds.forEach((cloud) => {
            cloud.rotation.y += 0.0001 * deltaTime;
            // Orbit clouds slowly
            const x = cloud.position.x;
            const z = cloud.position.z;
            const speed = 0.00005 * deltaTime;
            cloud.position.x = x * Math.cos(speed) - z * Math.sin(speed);
            cloud.position.z = x * Math.sin(speed) + z * Math.cos(speed);
        });
    }

    private updateCamera(deltaTime: number) {
        if (this.playerCar) {
            const carPos = this.playerCar.mesh.position.clone();
            const carDir = new THREE.Vector3();
            this.playerCar.mesh.getWorldDirection(carDir);

            // Initialize trailing position if not set
            if (this.trailingPosition.lengthSq() === 0) {
                this.trailingPosition.copy(carPos);
                this.trailingDirection.copy(carDir);
            }

            // Update trailing position with lag - follows car position smoothly
            const trailingSpeed = 4.0; // units per second - how fast trailing position follows car (reduced for more inertia)
            const trailingDirection = new THREE.Vector3().subVectors(
                carPos,
                this.trailingPosition,
            );
            const trailingDistance = trailingDirection.length();

            if (trailingDistance > 0.01) {
                const moveDistance = Math.min(
                    trailingDistance,
                    trailingSpeed * deltaTime,
                );
                trailingDirection.normalize().multiplyScalar(moveDistance);
                this.trailingPosition.add(trailingDirection);
            } else {
                this.trailingPosition.copy(carPos);
            }

            // Update trailing direction with lag - rotates toward car direction smoothly
            const maxDirectionSpeed = 0.7; // radians per second (reduced for more inertia on sharp curves)
            const dot = this.trailingDirection.dot(carDir);
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

            if (angle > 0.001) {
                const t = Math.min(
                    1.0,
                    (maxDirectionSpeed * deltaTime) / angle,
                );
                this.trailingDirection.lerp(carDir, t).normalize();
            } else {
                this.trailingDirection.copy(carDir);
            }

            // Camera behind and above the trailing position
            const offset = this.trailingDirection.clone().multiplyScalar(-12)
                .add(new THREE.Vector3(0, 8, 0));
            const targetPos = this.trailingPosition.clone().add(offset);

            // Smooth camera position movement with speed limit
            const maxPositionSpeed = 6.0; // units per second (reduced for more inertia)
            const cameraDirection = new THREE.Vector3().subVectors(
                targetPos,
                this.camera.position,
            );
            const cameraDistance = cameraDirection.length();

            if (cameraDistance > 0.01) {
                const moveDistance = Math.min(
                    cameraDistance,
                    maxPositionSpeed * deltaTime,
                );
                cameraDirection.normalize().multiplyScalar(moveDistance);
                this.camera.position.add(cameraDirection);
            } else {
                this.camera.position.copy(targetPos);
            }

            // Look ahead of the trailing position (but still reference actual car for look target)
            const lookAtTarget = this.trailingPosition.clone().add(
                this.trailingDirection.clone().multiplyScalar(5),
            );

            // Smooth rotation with angular speed limit
            const dummyCam = this.camera.clone();
            dummyCam.position.copy(this.camera.position);
            dummyCam.lookAt(lookAtTarget);

            const targetQuaternion = dummyCam.quaternion.clone();
            const maxAngularSpeed = 0.1; // radians per second (reduced for more rotational inertia)

            // Calculate the angle between current and target rotation
            const rotDot = this.camera.quaternion.dot(targetQuaternion);
            const rotAngle = Math.acos(Math.abs(rotDot) * 2 - 1);

            if (rotAngle > 0.01) {
                const t = Math.min(
                    1.0,
                    (maxAngularSpeed * deltaTime) / rotAngle,
                );
                this.camera.quaternion.slerp(targetQuaternion, t);
            } else {
                this.camera.quaternion.copy(targetQuaternion);
            }
        }
    }

    private updateUI() {
        // Calculate ranks from simulator or existing car objects?
        // Since we sync cars, we can use cars. Or use simulator results.
        // The original code used cars properties.

        const sortedCars = [...this.cars].sort((a, b) => {
            if (a.finished && b.finished) return a.finishTime - b.finishTime;
            if (a.finished) return -1;
            if (b.finished) return 1;

            const distA = a.lap + a.getProgress();
            const distB = b.lap + b.getProgress();
            return distB - distA;
        });

        // Map to data for UI
        const leaderboardData = sortedCars.map((c, index) => ({
            name: c.id,
            rank: index + 1,
            lap: c.lap,
            progress: c.getProgress(),
            finished: c.finished,
            finishTime: c.finishTime,
            stats: c.stats,
        }));

        this.uiManager.updateLeaderboard(leaderboardData);

        // Update HUD (Speed, Position, Item)
        const simCars = this.simulator.getCars();
        const playerSimCar = simCars.find((c) => c.isPlayer);

        if (playerSimCar) {
            // Speed - convert from progress/sec to real KM/H
            const speedKmh = this.simulator.convertSpeedToKmh(
                playerSimCar.currentSpeed,
            );
            this.uiManager.updateSpeed(speedKmh);

            // Position
            const playerRank = leaderboardData.find((d) =>
                d.name === "You"
            )?.rank || 0;
            this.uiManager.updatePosition(playerRank, this.cars.length);

            // Effects
            this.uiManager.updateEffects(playerSimCar.activeEffects);

            // NOTE: Item distribution logic removed for deterministic simulation
            // The shared simulation only gives the player the initial item from slotIndex 0,
            // and then items are only consumed (via bot logic). No additional items are given.
            // This matches the shared simulation behavior.

            this.uiManager.updateItem(playerSimCar.currentItem);
        }

        const playerCar = this.cars.find((c) => c.isPlayer);

        // Player Finish Trigger
        if (playerCar && playerCar.finished && !this.hasPlayerFinished) {
            this.hasPlayerFinished = true;
            this.handlePlayerFinish(leaderboardData);
        }

        // Update Results Screen if Player Finished
        if (this.hasPlayerFinished) {
            this.uiManager.showResults(leaderboardData);
        }

        // Stop Simulation only when ALL cars are finished
        if (this.cars.every((c) => c.finished) && this.isRunning) {
            this.isRunning = false;
            this.compareResults();
        }
    }

    private async handlePlayerFinish(leaderboardData: any[]) {
        // Submit player result
        const playerResult = leaderboardData.find((d) => d.name === "You");
        if (playerResult) {
            try {
                this.loadLeaderboard();
            } catch (e) {
                console.error("Failed to submit result", e);
            }
        }
    }

    private compareSnapshots(expected: GameSnapshot, actual: GameSnapshot, updateCount: number): boolean {
        // Compare time (allow small floating point difference)
        if (Math.abs(expected.time - actual.time) > 0.01) {
            console.error(`❌ Time mismatch at update ${updateCount}: expected=${expected.time.toFixed(2)}, actual=${actual.time.toFixed(2)}`);
            return false;
        }
        
        // Compare number of cars
        if (expected.cars.length !== actual.cars.length) {
            console.error(`❌ Car count mismatch at update ${updateCount}: expected=${expected.cars.length}, actual=${actual.cars.length}`);
            return false;
        }
        
        // Compare each car
        for (let i = 0; i < expected.cars.length; i++) {
            const expectedCar = expected.cars[i];
            const actualCar = actual.cars.find(c => c.id === expectedCar.id);
            
            if (!actualCar) {
                console.error(`❌ Car ${expectedCar.id} not found in actual snapshot at update ${updateCount}`);
                return false;
            }
            
            // Compare car state
            if (Math.abs(expectedCar.progress - actualCar.progress) > 0.0001) {
                console.error(`❌ Car ${expectedCar.id} progress mismatch at update ${updateCount}: expected=${expectedCar.progress.toFixed(6)}, actual=${actualCar.progress.toFixed(6)}`);
                return false;
            }
            
            if (expectedCar.lap !== actualCar.lap) {
                console.error(`❌ Car ${expectedCar.id} lap mismatch at update ${updateCount}: expected=${expectedCar.lap}, actual=${actualCar.lap}`);
                return false;
            }
            
            if (expectedCar.finished !== actualCar.finished) {
                console.error(`❌ Car ${expectedCar.id} finished state mismatch at update ${updateCount}: expected=${expectedCar.finished}, actual=${actualCar.finished}`);
                return false;
            }
            
            if (expectedCar.currentItem !== actualCar.currentItem) {
                console.error(`❌ Car ${expectedCar.id} currentItem mismatch at update ${updateCount}: expected=${expectedCar.currentItem}, actual=${actualCar.currentItem}`);
                return false;
            }
            
            // Compare active effects (simplified - just count and types)
            if (expectedCar.activeEffects.length !== actualCar.activeEffects.length) {
                console.error(`❌ Car ${expectedCar.id} activeEffects count mismatch at update ${updateCount}: expected=${expectedCar.activeEffects.length}, actual=${actualCar.activeEffects.length}`);
                console.error(`  Expected effects:`, JSON.stringify(expectedCar.activeEffects));
                console.error(`  Actual effects:`, JSON.stringify(actualCar.activeEffects));
                return false;
            }
        }
        
        return true;
    }

    private compareResults() {
        if (!this.expectedResults) {
            console.warn("No expected results available for comparison");
            return;
        }

        const actualResults = this.simulator.results;
        console.log("=== SIMULATION RESULTS COMPARISON ===");
        console.log("Expected results (from shared simulation):", JSON.stringify(this.expectedResults, null, 2));
        console.log("Actual results (from visual simulation):", JSON.stringify(actualResults, null, 2));
        console.log("Visual simulation update calls:", this.simulator.updateCallCount);
        
        // Log simulation time info
        const expectedTotalTime = this.expectedResults[this.expectedResults.length - 1]?.time || 0;
        const actualTotalTime = actualResults[actualResults.length - 1]?.time || 0;
        console.log(`Expected total race time: ${expectedTotalTime.toFixed(2)}ms`);
        console.log(`Actual total race time: ${actualTotalTime.toFixed(2)}ms`);
        console.log(`Time difference: ${Math.abs(expectedTotalTime - actualTotalTime).toFixed(2)}ms`);

        // Compare results
        if (actualResults.length !== this.expectedResults.length) {
            console.error(
                `Mismatch: Expected ${this.expectedResults.length} results, got ${actualResults.length}`,
            );
        } else {
            console.log(`✓ Both simulations have ${actualResults.length} results`);
        }

        // Compare each result
        const maxLength = Math.max(actualResults.length, this.expectedResults.length);
        for (let i = 0; i < maxLength; i++) {
            const expected = this.expectedResults[i];
            const actual = actualResults[i];

            if (!expected || !actual) {
                console.error(`Result ${i + 1}: Missing in one of the simulations`);
                continue;
            }

            const rankMatch = expected.rank === actual.rank;
            const playerIdMatch = expected.playerId === actual.playerId;
            // Allow up to 250ms difference for timing precision (accumulator pattern + floating point precision)
            const timeMatch = Math.abs(expected.time - actual.time) < 250;

            if (rankMatch && playerIdMatch && timeMatch) {
                console.log(
                    `✓ Result ${i + 1}: Rank ${expected.rank} - ${expected.playerId} - ${expected.time.toFixed(2)}s`,
                );
            } else {
                console.warn(`⚠ Result ${i + 1} mismatch:`);
                console.warn(`  Expected: Rank ${expected.rank}, ${expected.playerId}, ${expected.time.toFixed(2)}s`);
                console.warn(`  Actual:   Rank ${actual.rank}, ${actual.playerId}, ${actual.time.toFixed(2)}s`);
                if (!rankMatch) console.warn(`    ✗ Rank mismatch`);
                if (!playerIdMatch) console.warn(`    ✗ Player ID mismatch`);
                if (!timeMatch) console.warn(`    ✗ Time mismatch (diff: ${Math.abs(expected.time - actual.time).toFixed(2)}s)`);
            }
        }

        // Overall summary (allow up to 250ms difference for timing precision)
        const allMatch = actualResults.length === this.expectedResults.length &&
            actualResults.every((actual, i) => {
                const expected = this.expectedResults![i];
                return expected &&
                    expected.rank === actual.rank &&
                    expected.playerId === actual.playerId &&
                    Math.abs(expected.time - actual.time) < 250; // 250ms tolerance
            });

        if (allMatch) {
            console.log("✓✓✓ ALL RESULTS MATCH! ✓✓✓");
        } else {
            console.warn("⚠⚠⚠ SOME RESULTS DO NOT MATCH ⚠⚠⚠");
        }
        console.log("=== END COMPARISON ===");
    }

    private animate = () => {
        requestAnimationFrame(this.animate);

        const now = performance.now();
        const deltaTime = Math.min(now - this.lastTime, 100);
        this.lastTime = now;

        if (this.isRunning) {
            this.updatePhysics(deltaTime);
            this.updateCamera(deltaTime);
            this.updateUI();
            // this.updateHover();
        } else {
            this.updateIntro(deltaTime);
        }

        // Always update sky
        this.updateSky(deltaTime);

        // this.crtPass.uniforms['iTime'].value = performance.now() / 1000;
        this.composer.render();
    };

    private onWindowResize() {
        if (this.camera && this.renderer && this.container) {
            this.camera.aspect = this.container.clientWidth /
                this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(
                this.container.clientWidth,
                this.container.clientHeight,
            );
            this.composer.setSize(
                this.container.clientWidth,
                this.container.clientHeight,
            );

            if (this.crtPass) {
                const width = this.container.clientWidth;
                const height = this.container.clientHeight;
                const size = new THREE.Vector2(width, height);

                this.crtPass.uniforms["TextureSize"].value.copy(size);
                this.crtPass.uniforms["InputSize"].value.copy(size);
                this.crtPass.uniforms["OutputSize"].value.copy(size);
            }
        }
    }
}
