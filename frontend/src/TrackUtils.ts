import * as THREE from 'three';
import { TrackConfig, TrackCondition } from './types.ts';
import { RNG } from './RNG.ts';

export class TrackUtils {
    static generateTrackConfig(): TrackConfig {
        const conditions = [TrackCondition.ASPHALT, TrackCondition.DIRT, TrackCondition.ICE];
        const selected = conditions[Math.floor(RNG.next() * conditions.length)];
        
        switch (selected) {
            case TrackCondition.DIRT:
                return {
                    condition: TrackCondition.DIRT,
                    speedModifier: 0.4,
                    handlingModifier: 0.6,
                    gripModifier: 0.3,
                    roadColor: 0x8B4513, // SaddleBrown
                    grassColor: 0x556B2F, // DarkOliveGreen
                    skyColor: 0x87CEEB
                };
            case TrackCondition.ICE:
                return {
                    condition: TrackCondition.ICE,
                    speedModifier: 0.9,
                    handlingModifier: 0.2,
                    gripModifier: 0.05,
                    roadColor: 0xE0FFFF, // LightCyan
                    grassColor: 0xF0F8FF, // AliceBlue
                    skyColor: 0xB0E0E6 // PowderBlue
                };
            case TrackCondition.ASPHALT:
            default:
                return {
                    condition: TrackCondition.ASPHALT,
                    speedModifier: 1.0,
                    handlingModifier: 1.0,
                    gripModifier: 1.0,
                    roadColor: 0x333333,
                    grassColor: 0x006266,
                    skyColor: 0x87CEEB
                };
        }
    }

    static generateRandomTrackPoints(): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];
        const numPoints = 20;
        const baseRadius = 50;
        const radiusVar = 20;

        for (let i = 0; i < numPoints; i++) {
            // Evenly spaced angles to ensure loop
            const angle = (i / numPoints) * Math.PI * 2;
            
            // Random radius
            const radius = baseRadius + (RNG.next() - 0.5) * radiusVar * 2;
            
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            points.push(new THREE.Vector3(x, 0, z));
        }
        return points;
    }
}


