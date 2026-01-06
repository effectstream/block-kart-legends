import * as THREE from 'three';
import { ItemType } from '../simulation/types.ts';
import { createMushroomModel } from './Mushroom.ts';
import { createBananaModel } from './Banana.ts';
import { createRedShellModel } from './RedShell.ts';
import { createStarModel } from './Star.ts';
import { createLightningModel } from './Lightning.ts';

export * from './Mushroom';
export * from './Banana';
export * from './RedShell';
export * from './Star';
export * from './Lightning';

export function createItemModel(type: ItemType): THREE.Group {
    switch (type) {
        case 'Mushroom':
            return createMushroomModel();
        case 'Banana':
            return createBananaModel();
        case 'Red Shell':
            return createRedShellModel();
        case 'Star':
            return createStarModel();
        case 'Lightning':
            return createLightningModel();
        default:
            console.warn(`Unknown item type: ${type}`);
            return new THREE.Group();
    }
}
