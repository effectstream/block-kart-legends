import * as THREE from 'three';
import { Car } from './Car.ts';
import { Circuit } from './Circuit.ts';
import { TrackUtils } from './TrackUtils.ts';
import { UIManager } from './UIManager.ts';
import { VehicleStats, PlayerConfig, TrackConfig, ItemType } from './types.ts';
import { GhibliGrass } from './GhibliGrass.ts';
import { GameSimulator, CarConfig } from './GameSimulator.ts';
import { MockService } from './MockService.ts';
import { createItemModel } from './models/index.ts';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CRTShader } from './shaders/CRTShader.ts';
import { RNG } from './RNG.ts';

const NUMBER_OF_BOTS = 7;

export class GameManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private composer: EffectComposer;
    private crtPass: ShaderPass;
    private circuit: Circuit;
    private cars: Car[] = [];
    private playerCar: Car | null = null;
    private uiManager: UIManager;
    private lastTime: number = 0;
    private container: HTMLElement;
    private isRunning: boolean = false;
    private ghibliGrass: GhibliGrass | null = null;
    private simulator: GameSimulator;
    private trackPoints: THREE.Vector3[];
    private api: MockService;
    private trackConfig: TrackConfig;
    private currentConfig: PlayerConfig | null = null;
    private introGroup: THREE.Group | null = null;
    private introWrapper: THREE.Group | null = null;
    private introTime: number = 0;
    private lastSlotIndex: number = -1;
    private hasPlayerFinished: boolean = false;
    
    private keysPressed = new Set<string>();
    private clouds: THREE.Group[] = [];
    
    // Camera trailing system for smooth curves
    private trailingPosition: THREE.Vector3 = new THREE.Vector3();
    private trailingDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 1);

    constructor(containerId: string, seed?: number) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container ${containerId} not found`);
        this.container = container;
        
        // Initialize RNG
        const initialSeed = seed ?? Date.now();
        RNG.setSeed(initialSeed);
        console.log(`Game initialized with seed: ${initialSeed}`);
        
        this.api = MockService.getInstance();

        // UI Manager
        this.uiManager = new UIManager();
        this.bindUI();

        // Load initial leaderboard
        this.loadLeaderboard();

        // Generate Track Config
        this.trackConfig = TrackUtils.generateTrackConfig();
        console.log("Track Config:", this.trackConfig);

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.trackConfig.skyColor); 
        this.scene.fog = new THREE.Fog(this.trackConfig.skyColor, 20, 100);

        // Sky Elements
        this.createSky();

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 20, 20);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
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
        
        this.crtPass.uniforms['TextureSize'].value.copy(size);
        this.crtPass.uniforms['InputSize'].value.copy(size);
        this.crtPass.uniforms['OutputSize'].value.copy(size);
        
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

        // Track
        this.trackPoints = TrackUtils.generateRandomTrackPoints();
        this.circuit = new Circuit(this.scene, this.trackPoints, this.trackConfig);
        
        // Simulator
        this.simulator = new GameSimulator(this.trackPoints, 3, this.trackConfig); // 3 laps default

        // Resize handler
        window.addEventListener('resize', () => this.onWindowResize());

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

        const types: ItemType[] = ['Mushroom', 'Banana', 'Red Shell', 'Star', 'Lightning'];
        const radius = 6;
        const count = types.length;

        types.forEach((type, i) => {
            const item = createItemModel(type);
            const angle = (i / count) * Math.PI * 2;
            item.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
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
            this.introGroup.children.forEach(child => {
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
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning || !this.playerCar) return;

            this.keysPressed.add(e.code);

            // Item Usage (One-shot)
            if (e.code === 'Space' || e.key === ' ') {
                 this.simulator.useItem(this.playerCar.id);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keysPressed.delete(e.code);
        });
    }

    private resetGame() {
        this.isRunning = false;
        // if (this.animationId) cancelAnimationFrame(this.animationId); // Don't stop loop
        
        // Remove old cars
        this.cars.forEach(c => {
            this.scene.remove(c.mesh);
        });
        this.cars = [];
        this.playerCar = null;

        // Clean up grass
        if (this.ghibliGrass) {
            this.ghibliGrass.dispose();
            this.ghibliGrass = null;
        }

        this.uiManager.showScreen('start-screen');
        
        this.setupIntroScene();
        
        // Reload global leaderboard instead of clearing
        this.loadLeaderboard();
    }

    public async startRace(playerConfig: PlayerConfig) {
        this.currentConfig = playerConfig;
        this.teardownIntroScene();
        this.lastSlotIndex = -1;
        this.hasPlayerFinished = false;

        // Log login if not already (simulated)
        try {
             await this.api.login('Player');
        } catch(e) { console.warn("Login failed", e); }

        this.uiManager.hideAllScreens();
        this.createCars(playerConfig);
        
        // Create Grass
        if (this.playerCar) {
            const trackMask = this.circuit.getTrackMask();
            this.ghibliGrass = new GhibliGrass(this.scene, this.playerCar.mesh, trackMask);
        }

        this.isRunning = true;
        this.lastTime = performance.now();
        
        this.animate(); // Loop is already running
    }

    private generateBotStats(): VehicleStats {
        const stats = [1, 1, 1, 1, 1];
        let budget = 25 - 5;
        
        while (budget > 0) {
            const idx = Math.floor(RNG.next() * 5);
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
            boost_efficiency: 5 // Default
        };
    }

    private createCars(playerConfig: PlayerConfig) {
        console.log("Starting race with configuration:", playerConfig);
        const carConfigs: CarConfig[] = [];

        // Player
        const playerCarId = 'You';
        this.playerCar = new Car(this.scene, this.circuit, playerCarId, playerConfig.stats, 0xff0000, true);
        this.cars.push(this.playerCar);
        
        // Reset trailing position for camera lag system (will be initialized on first camera update)
        this.trailingPosition.set(0, 0, 0);
        this.trailingDirection.set(0, 0, 1);
        
        carConfigs.push({
            id: playerCarId,
            stats: playerConfig.stats,
            isPlayer: true,
            startProgress: 0,
            horizontalOffset: 0
        });

        // Bots
        const colors = [
            0xff0000, // Racing Red
            0x222222, // Carbon Black
            0xffffff, // Pure White
            0x0055ff, // Electric Blue
            0xffa500, // Circuit Orange
            0x800080, // Royal Purple
            0x00ffcc,  // Hyper Teal
            0x00ffff, // Cyan
            0xff00ff, // Magenta
            0x39ff14, // Neon Green
            0xffff00, // Laser Yellow
            0xff3131, // Neon Red
            0xbc13fe  // Neon Violet
        ];
        const names = [    
            'Apex Predator',
            'Carbon X',
            'Velocity Prime',
            'Blue Streak',
            'Ignition',
            'Phantom Racer',
            'Neon Pulse', 'Cyber Ghost',
            'Data Stream',
            'Flux Capacitor',
            'Neural Link',
            'Glitch',
            'Synth Wave'
        ];
        
        for (let i = 0; i < NUMBER_OF_BOTS; i++) {
            const botStats = this.generateBotStats();
            const index = Math.floor(RNG.next() * names.length);
            const botName = names[index];
            const botColor = colors[index];
            names.splice(index, 1);
            colors.splice(index, 1);
            const bot = new Car(this.scene, this.circuit, botName, botStats, botColor);
            // Stagger start positions
            const startProgress = -0.02 * (i + 1);
            
            // Visual car setup
            bot.updateState(startProgress, 1, false);
            this.cars.push(bot);

            // Bot Random Item
            const items: ItemType[] = ['Mushroom', 'Banana', 'Red Shell', 'Star', 'Lightning'];
            const randomItem = items[Math.floor(RNG.next() * items.length)];

            // Simulator config
            carConfigs.push({
                id: botName,
                stats: botStats,
                isPlayer: false,
                startProgress: startProgress,
                horizontalOffset: 0,
                initialItem: randomItem
            });
        }

        // Initialize Simulator
        this.simulator.start(carConfigs);
    }

    private updatePhysics(deltaTime: number) {
        // Step the simulator
        this.simulator.update(deltaTime);

        // Update Circuit (Materials)
        this.circuit.update(deltaTime / 1000);

        // Sync visual cars with simulation state
        const simCars = this.simulator.getCars();
        
        this.cars.forEach(car => {
            const simState = simCars.find(c => c.id === car.id);
            if (simState) {
                car.updateState(simState.progress, simState.lap, simState.finished);
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
        this.handlePlayerInput(deltaTime);

        // Update Grass
        if (this.ghibliGrass) {
            // this.ghibliGrass.update(deltaTime / 1000);
        }
    }

    private handlePlayerInput(deltaTime: number) {
        if (!this.playerCar) return;

        const simCar = this.simulator.getCars().find(c => c.id === this.playerCar!.id);
        
        // Only allow steering if moving
        if (simCar && simCar.currentSpeed > 0) {
            const steerSpeed = 0.005 * deltaTime; // Tuning

            if (this.keysPressed.has('ArrowLeft') || this.keysPressed.has('KeyA')) {
                this.playerCar.horizontalOffset -= steerSpeed;
            }
            if (this.keysPressed.has('ArrowRight') || this.keysPressed.has('KeyD')) {
                this.playerCar.horizontalOffset += steerSpeed;
            }
            
            // Clamp (redundant with resolveVisualCollisions but good for feel)
            const trackWidthLimit = 4.0;
            this.playerCar.horizontalOffset = Math.max(-trackWidthLimit, Math.min(trackWidthLimit, this.playerCar.horizontalOffset));
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

        this.cars.forEach(car => {
            let move = 0;
            const prog = car.getProgress();

            this.cars.forEach(other => {
                if (car === other) return;

                const otherProg = other.getProgress();
                let delta = otherProg - prog;
                
                // Wrap around logic for circular track
                if (delta > 0.5) delta -= 1;
                if (delta < -0.5) delta += 1;

                // If 'other' is ahead (delta > 0) and close
                if (delta > 0 && delta < minLongitudinalDist) {
                    const latDist = other.horizontalOffset - car.horizontalOffset;
                    
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
        this.cars.forEach(car => {
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
                        car.horizontalOffset -= Math.sign(car.horizontalOffset) * centeringSpeed * deltaTime;
                    } else {
                        car.horizontalOffset = 0;
                    }
                } else {
                     // For player, maybe less centering or none? 
                     // Let's keep it minimal for player so they can hold a lane
                     if (Math.abs(car.horizontalOffset) > 0.1) {
                        car.horizontalOffset -= Math.sign(car.horizontalOffset) * (centeringSpeed * 0.1) * deltaTime;
                    }
                }
            }
            
            // Clamp to track limits
            car.horizontalOffset = Math.max(-trackWidthLimit, Math.min(trackWidthLimit, car.horizontalOffset));
        });
    }

    private createSky() {
        // Sun
        // Align sun with directional light (10, 20, 10)
        const sunPos = new THREE.Vector3(10, 20, 10).normalize().multiplyScalar(800);
        
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
                opacity: 0.9
            });

            // Create blobs
            const blobs = 3 + Math.floor(RNG.next() * 5);
            for(let j=0; j<blobs; j++) {
                const blob = new THREE.Mesh(cloudGeo, cloudMat);
                blob.position.set(
                    (RNG.next() - 0.5) * 40,
                    (RNG.next() - 0.5) * 20,
                    (RNG.next() - 0.5) * 30
                );
                const scale = 0.6 + RNG.next() * 0.8;
                blob.scale.setScalar(scale);
                cloudGroup.add(blob);
            }

            // Position cloud
            const angle = RNG.next() * Math.PI * 2;
            const dist = 600 + RNG.next() * 300;
            const height = 200 + RNG.next() * 200;
            
            cloudGroup.position.set(
                Math.cos(angle) * dist,
                height,
                Math.sin(angle) * dist
            );
            
            // Random rotation
            cloudGroup.rotation.y = RNG.next() * Math.PI * 2;

            this.scene.add(cloudGroup);
            this.clouds.push(cloudGroup);
        }
    }

    private updateSky(deltaTime: number) {
        this.clouds.forEach(cloud => {
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
            const trailingDirection = new THREE.Vector3().subVectors(carPos, this.trailingPosition);
            const trailingDistance = trailingDirection.length();
            
            if (trailingDistance > 0.01) {
                const moveDistance = Math.min(trailingDistance, trailingSpeed * deltaTime);
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
                const t = Math.min(1.0, (maxDirectionSpeed * deltaTime) / angle);
                this.trailingDirection.lerp(carDir, t).normalize();
            } else {
                this.trailingDirection.copy(carDir);
            }

            // Camera behind and above the trailing position
            const offset = this.trailingDirection.clone().multiplyScalar(-12).add(new THREE.Vector3(0, 8, 0));
            const targetPos = this.trailingPosition.clone().add(offset);
            
            // Smooth camera position movement with speed limit
            const maxPositionSpeed = 6.0; // units per second (reduced for more inertia)
            const cameraDirection = new THREE.Vector3().subVectors(targetPos, this.camera.position);
            const cameraDistance = cameraDirection.length();
            
            if (cameraDistance > 0.01) {
                const moveDistance = Math.min(cameraDistance, maxPositionSpeed * deltaTime);
                cameraDirection.normalize().multiplyScalar(moveDistance);
                this.camera.position.add(cameraDirection);
            } else {
                this.camera.position.copy(targetPos);
            }
            
            // Look ahead of the trailing position (but still reference actual car for look target)
            const lookAtTarget = this.trailingPosition.clone().add(this.trailingDirection.clone().multiplyScalar(5));
            
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
                const t = Math.min(1.0, (maxAngularSpeed * deltaTime) / rotAngle);
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
            stats: c.stats
        }));

        this.uiManager.updateLeaderboard(leaderboardData);

        // Update HUD (Speed, Position, Item)
        const simCars = this.simulator.getCars();
        const playerSimCar = simCars.find(c => c.isPlayer);
        
        if (playerSimCar) {
            // Speed - convert from progress/sec to real KM/H
            const speedKmh = this.simulator.convertSpeedToKmh(playerSimCar.currentSpeed);
            this.uiManager.updateSpeed(speedKmh);
            
            // Position
            const playerRank = leaderboardData.find(d => d.name === 'You')?.rank || 0;
            this.uiManager.updatePosition(playerRank, this.cars.length);
            
            // Effects
            this.uiManager.updateEffects(playerSimCar.activeEffects);
            
            // Item Distribution Logic
            if (this.currentConfig && this.currentConfig.items) {
                const currentLapIndex = playerSimCar.lap - 1; // 0-based
                let slotIndex = -1;
                
                if (playerSimCar.progress < 0.33) {
                    slotIndex = currentLapIndex * 3 + 0;
                } else if (playerSimCar.progress < 0.66) {
                    slotIndex = currentLapIndex * 3 + 1;
                } else {
                    slotIndex = currentLapIndex * 3 + 2;
                }
                
                if (playerSimCar.finished) {
                     slotIndex = 9;
                }
                
                // Give item if entering new slot and empty
                if (slotIndex !== this.lastSlotIndex) {
                    this.lastSlotIndex = slotIndex;
                    const itemEntry = this.currentConfig.items.find(i => i.slotIndex === slotIndex);
                    if (itemEntry && !playerSimCar.currentItem) {
                        playerSimCar.currentItem = itemEntry.itemType;
                    }
                }
            }
            
            this.uiManager.updateItem(playerSimCar.currentItem);
        }

        const playerCar = this.cars.find(c => c.isPlayer);
        
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
        if (this.cars.every(c => c.finished) && this.isRunning) {
            this.isRunning = false;
        }
    }

    private async handlePlayerFinish(leaderboardData: any[]) {
        // Submit player result
        const playerResult = leaderboardData.find(d => d.name === 'You');
        if (playerResult) {
            try {
                await this.api.saveRaceResult({
                    rank: playerResult.rank,
                    playerName: 'Player',
                    playerId: 'player-1',
                    time: playerResult.finishTime
                });
                console.log("Race result submitted");
                // Optionally reload global leaderboard after submission
                this.loadLeaderboard(); 
            } catch (e) {
                console.error("Failed to submit result", e);
            }
        }
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
    }

    private onWindowResize() {
        if (this.camera && this.renderer && this.container) {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
            
            if (this.crtPass) {
                const width = this.container.clientWidth;
                const height = this.container.clientHeight;
                const size = new THREE.Vector2(width, height);
                
                this.crtPass.uniforms['TextureSize'].value.copy(size);
                this.crtPass.uniforms['InputSize'].value.copy(size);
                this.crtPass.uniforms['OutputSize'].value.copy(size);
            }
        }
    }
}
