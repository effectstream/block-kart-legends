import * as THREE from 'three';

export function createStarModel(): THREE.Group {
    const group = new THREE.Group();

    // Create a star shape
    const starShape = new THREE.Shape();
    const outerRadius = 0.3;
    const innerRadius = 0.15;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2; // Start top
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) starShape.moveTo(x, y);
        else starShape.lineTo(x, y);
    }
    starShape.closePath();

    const extrudeSettings = {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2
    };

    const geometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    // Use Lambert/Phong if lights exist, but sticking to Basic for consistency unless changed later
    // Adding emissive to make it glowy
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); 
    const star = new THREE.Mesh(geometry, material);
    
    // Center geometry
    geometry.center();
    
    star.position.y = 0.3;
    // Rotate slightly
    // star.rotation.y = Math.PI / 4; 
    
    group.add(star);

    // Eyes (Classic Mario Star eyes)
    const eyeGeometry = new THREE.CapsuleGeometry(0.02, 0.08, 4, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.06, 0.3, 0.08); // Front face z is approx 0.05 (depth/2)
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.06, 0.3, 0.08);
    group.add(rightEye);

    return group;
}

