import * as THREE from 'three';

export function createMushroomModel(): THREE.Group {
    const group = new THREE.Group();

    // Stalk
    const stalkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.2, 8);
    const stalkMaterial = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
    stalk.position.y = 0.1;
    group.add(stalk);

    // Cap
    const capGeometry = new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.2;
    group.add(cap);

    // Spots (simple white dots)
    const spotGeometry = new THREE.CircleGeometry(0.06, 8);
    const spotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // const positions = [
    //     { x: 0.15, y: 0.35, z: 0, rotX: -Math.PI/4, rotZ: 0 },
    //     { x: -0.15, y: 0.35, z: 0, rotX: -Math.PI/4, rotZ: 0 },
    //     { x: 0, y: 0.35, z: 0.15, rotX: 0, rotZ: -Math.PI/4 },
    //     { x: 0, y: 0.35, z: -0.15, rotX: 0, rotZ: Math.PI/4 }
    // ];

    // For simplicity, just adding a few fixed spots manually rotated/positioned
    // Top spot
    const topSpot = new THREE.Mesh(spotGeometry, spotMaterial);
    topSpot.rotation.x = -Math.PI / 2;
    topSpot.position.y = 0.451; // Just above cap radius (0.2 + 0.25 = 0.45)
    group.add(topSpot);

    // Side spots
    const sideSpotGeo = new THREE.SphereGeometry(0.05, 8, 8);
    // Just place small spheres for spots to avoid complex decal logic
    const spot1 = new THREE.Mesh(sideSpotGeo, spotMaterial);
    spot1.position.set(0.18, 0.3, 0);
    group.add(spot1);

    const spot2 = new THREE.Mesh(sideSpotGeo, spotMaterial);
    spot2.position.set(-0.18, 0.3, 0);
    group.add(spot2);

    const spot3 = new THREE.Mesh(sideSpotGeo, spotMaterial);
    spot3.position.set(0, 0.3, 0.18);
    group.add(spot3);
    
    const spot4 = new THREE.Mesh(sideSpotGeo, spotMaterial);
    spot4.position.set(0, 0.3, -0.18);
    group.add(spot4);

    return group;
}

