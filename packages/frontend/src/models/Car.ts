import * as THREE from "three";
import { Circuit } from "./Circuit.ts";
import { VehicleStats } from "../simulation/types.ts";
import {
    carFragmentShader,
    carVertexShader,
} from "./../shaders/proceduralMaterials.ts";
import { createItemModel } from "./index.ts";
import { ActiveEffect } from "../simulation/GameSimulator.ts";
import { CarBase } from "../simulation/CartBase.ts";

export class Car extends CarBase {
    public mesh: THREE.Group;
    private scene: THREE.Scene;
    private circuit: Circuit;

    private carMaterial: THREE.ShaderMaterial;
    private time: number = 0;

    private visualEffectsGroup: THREE.Group;
    private currentEffectType: string | null = null;

    constructor(
        scene: THREE.Scene,
        circuit: Circuit,
        id: string,
        stats: VehicleStats,
        color: string | number,
        isPlayer: boolean = false,
    ) {
        super(id, stats, isPlayer);
        this.scene = scene;
        this.circuit = circuit;

        this.mesh = new THREE.Group();

        this.visualEffectsGroup = new THREE.Group();
        this.visualEffectsGroup.position.y = 1.0;
        this.mesh.add(this.visualEffectsGroup);

        // Dimensions
        const chassisWidth = 0.5;
        const chassisHeight = 0.15;
        const chassisLength = 1.0;

        const cabinWidth = 0.4;
        const cabinHeight = 0.12;
        const cabinLength = 0.5;

        const wheelRadius = 0.1;
        const wheelThickness = 0.1;

        // Material Setup
        const baseColor = new THREE.Color(color);
        const hsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(hsl);
        const highlightColor = new THREE.Color().setHSL(
            hsl.h,
            Math.max(0, Math.min(1, hsl.s + 0.2)),
            Math.min(1, hsl.l + 0.3),
        );

        this.carMaterial = new THREE.ShaderMaterial({
            vertexShader: carVertexShader,
            fragmentShader: carFragmentShader,
            uniforms: {
                uBaseColor: { value: baseColor },
                uHighlightColor: { value: highlightColor },
                uTime: { value: 0 },
            },
        });

        // 1. Chassis
        const chassisGeometry = new THREE.BoxGeometry(
            chassisWidth,
            chassisHeight,
            chassisLength,
        );
        const chassis = new THREE.Mesh(chassisGeometry, this.carMaterial);
        // Lift chassis so wheels touch ground (y=0) roughly.
        chassis.position.y = wheelRadius + 0.05;
        this.mesh.add(chassis);

        // 2. Cabin
        const cabinGeometry = new THREE.BoxGeometry(
            cabinWidth,
            cabinHeight,
            cabinLength,
        );
        const cabin = new THREE.Mesh(cabinGeometry, this.carMaterial);
        // Position on top of chassis
        cabin.position.y = chassis.position.y + chassisHeight / 2 +
            cabinHeight / 2;
        // Shift cabin slightly back (-Z) so hood is longer (Front is +Z)
        cabin.position.z = -0.1;
        this.mesh.add(cabin);

        // 3. Wheels
        const wheelGeometry = new THREE.CylinderGeometry(
            wheelRadius,
            wheelRadius,
            wheelThickness,
            16,
        );
        const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // Front is +Z, Rear is -Z (to align with lookAt direction)
        const wheelPositions = [
            { x: chassisWidth / 2, z: (chassisLength / 2 - 0.2) }, // Front Left
            { x: -chassisWidth / 2, z: (chassisLength / 2 - 0.2) }, // Front Right
            { x: chassisWidth / 2, z: -(chassisLength / 2 - 0.2) }, // Rear Left
            { x: -chassisWidth / 2, z: -(chassisLength / 2 - 0.2) }, // Rear Right
        ];

        wheelPositions.forEach((pos) => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2; // Rotate to face sideways
            wheel.position.set(pos.x, wheelRadius, pos.z);
            this.mesh.add(wheel);
        });

        // 4. Glasses (Windshield and Rear window)
        const glassMaterial = new THREE.MeshBasicMaterial({ color: 0x88ccff });

        // Windshield (Front face of cabin, facing +Z)
        const windshieldGeometry = new THREE.BoxGeometry(
            cabinWidth - 0.02,
            cabinHeight - 0.02,
            0.05,
        );
        const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
        windshield.position.copy(cabin.position);
        windshield.position.z += cabinLength / 2; // Front of cabin (towards +Z)
        this.mesh.add(windshield);

        // Rear window (Rear face of cabin, facing -Z)
        const rearWindowGeometry = new THREE.BoxGeometry(
            cabinWidth - 0.02,
            cabinHeight - 0.02,
            0.05,
        );
        const rearWindow = new THREE.Mesh(rearWindowGeometry, glassMaterial);
        rearWindow.position.copy(cabin.position);
        rearWindow.position.z -= cabinLength / 2; // Back of cabin (towards -Z)
        this.mesh.add(rearWindow);

        this.scene.add(this.mesh);
    }

    public updateVisualEffects(activeEffects: ActiveEffect[]) {
        // Simple logic: Show first active effect indicator
        // Priority: Invincible > Stun > SpeedBoost > Shrink
        const priority = ["Invincible", "Stun", "SpeedBoost", "Shrink"];
        // Sort by priority (lowest index first)
        const sorted = [...activeEffects].sort((a, b) => {
            const pa = priority.indexOf(a.type);
            const pb = priority.indexOf(b.type);
            // If type not in priority list, move to end
            return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
        });

        const effect = sorted[0];

        if (!effect) {
            if (this.currentEffectType) {
                this.visualEffectsGroup.clear();
                this.currentEffectType = null;
                this.mesh.scale.setScalar(1);
            }
            return;
        }

        if (effect.type !== this.currentEffectType) {
            this.visualEffectsGroup.clear();
            this.currentEffectType = effect.type;

            if (effect.type === "Invincible") {
                const model = createItemModel("Star");
                model.scale.setScalar(2);
                this.visualEffectsGroup.add(model);
                this.mesh.scale.setScalar(1);
            } else if (effect.type === "Stun") {
                // Check label for Red Shell hit vs Banana slip
                // If label is 'Hit' -> Red Shell impact (maybe show shell or explosion)
                // If label is 'Slip' -> Banana
                const model = effect.label === "Hit"
                    ? createItemModel("Red Shell")
                    : createItemModel("Banana");
                model.position.y = 0.5;
                model.scale.setScalar(1.5);
                this.visualEffectsGroup.add(model);
                this.mesh.scale.setScalar(1);
            } else if (effect.type === "Shrink") {
                this.mesh.scale.setScalar(0.5);
            } else if (effect.type === "SpeedBoost") {
                const model = createItemModel("Mushroom");
                model.scale.setScalar(1.5);
                this.visualEffectsGroup.add(model);
                this.mesh.scale.setScalar(1);
            }
        }

        // Animation
        if (this.visualEffectsGroup.children.length > 0) {
            this.visualEffectsGroup.rotation.y += 0.1;
        }
    }

    public updateState(progress: number, lap: number, finished: boolean) {
        this.progress = progress;
        this.lap = lap;
        this.finished = finished;

        // Update position based on new progress
        const position = this.circuit.getPointAt(this.progress);
        const tangent = this.circuit.getTangentAt(this.progress).normalize();
        const up = new THREE.Vector3(0, 1, 0);

        // Calculate side vector for horizontal offset
        const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

        // Apply offset
        position.add(side.multiplyScalar(this.horizontalOffset));

        this.mesh.position.copy(position);
        this.mesh.lookAt(position.clone().add(tangent));
    }

    public update(deltaTime: number) {
        this.time += deltaTime;
        if (this.carMaterial) {
            this.carMaterial.uniforms.uTime.value = this.time;
        }
    }

    public setProgress(p: number) {
        this.progress = p;
        while (this.progress < 0) {
            this.progress += 1;
            this.lap--;
        }
        while (this.progress >= 1) {
            this.progress -= 1;
            this.lap++;
        }

        // Force update position immediately
        const position = this.circuit.getPointAt(this.progress);
        const tangent = this.circuit.getTangentAt(this.progress).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
        position.add(side.multiplyScalar(this.horizontalOffset));

        this.mesh.position.copy(position);
        this.mesh.lookAt(position.clone().add(tangent));
    }

    public override setSimState(progress: number, lap: number) {
        super.setSimState(progress, lap);
    }
}
