import * as THREE from 'three';

export function createLightningModel(): THREE.Group {
    const group = new THREE.Group();

    // Lightning Bolt Shape
    const shape = new THREE.Shape();
    // Simplified zigzag
    shape.moveTo(0.1, 0.4);
    shape.lineTo(-0.1, 0.1);
    shape.lineTo(0.05, 0.1);
    shape.lineTo(-0.15, -0.4);
    shape.lineTo(0.1, -0.1);
    shape.lineTo(-0.05, -0.1);
    shape.lineTo(0.1, 0.4);
    shape.closePath();

    const extrudeSettings = {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Use Phong material for better lighting interaction and to avoid flat shading artifacts
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xffff00,
        emissive: 0x666600,
        specular: 0xffff00,
        shininess: 30
    });
    const bolt = new THREE.Mesh(geometry, material);
    
    geometry.center();
    bolt.position.y = 0.3;
    
    group.add(bolt);

    return group;
}

