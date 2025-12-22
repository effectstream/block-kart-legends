import * as THREE from 'three';

export function createRedShellModel(): THREE.Group {
    const group = new THREE.Group();

    // Shell Body (Dome)
    const shellGeometry = new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const shellMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.position.y = 0.05; // Slightly up
    group.add(shell);

    // Rim (Torus)
    const rimGeometry = new THREE.TorusGeometry(0.25, 0.04, 8, 16);
    const rimMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.05;
    group.add(rim);

    // Opening (Dark bottom inside rim)
    const bottomGeometry = new THREE.CircleGeometry(0.22, 16);
    const bottomMaterial = new THREE.MeshBasicMaterial({ color: 0x220000 });
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = 0.05;
    group.add(bottom);

    return group;
}

