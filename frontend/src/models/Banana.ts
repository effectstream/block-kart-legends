import * as THREE from 'three';

export function createBananaModel(): THREE.Group {
    const group = new THREE.Group();

    // Banana Curve - Quadratic Bezier for a natural bend
    const path = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.15, 0.35, 0),  // Top
        new THREE.Vector3(-0.5, 0, 0),      // Control point (bulge)
        new THREE.Vector3(-0.15, -0.35, 0)  // Bottom
    );

    // Use 5 radial segments for the characteristic banana ridges
    const geometry = new THREE.TubeGeometry(path, 12, 0.08, 5, false);
    
    // Tapering (Manual vertex manipulation)
    // We assume the vertices are ordered ring by ring.
    // 13 rings (12 segments + 1), 5 vertices per ring.
    const pos = geometry.attributes.position;
    
    // We need to calculate the frame for each point to scale correctly, 
    // but a simple approximation is to scale towards the curve point.
    // Let's iterate rings.
    const rings = 12 + 1;
    const radial = 5;
    
    for (let i = 0; i < rings; i++) {
        const t = i / (rings - 1);
        // Taper factor: 1.0 in middle, 0.4 at ends
        // Parabolic: 4 * t * (1-t) peaks at 1 for t=0.5.
        // We want range [0.4, 1.0].
        // shape(t) = 0.4 + 0.6 * sin(t * PI)
        // or just linear taper? Bananas are fairly thick then taper fast.
        // Let's use sin^0.5
        const scale = 0.4 + 0.6 * Math.sin(t * Math.PI);

        // Get point on curve
        const center = path.getPointAt(t);

        for (let j = 0; j < radial; j++) {
            const idx = (i * radial + j); // Vertex index
            const x = pos.getX(idx);
            const y = pos.getY(idx);
            const z = pos.getZ(idx);

            // Vector from center to vertex
            const dx = x - center.x;
            const dy = y - center.y;
            const dz = z - center.z;

            // Scale it
            pos.setXYZ(idx, 
                center.x + dx * scale,
                center.y + dy * scale,
                center.z + dz * scale
            );
        }
    }
    
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ 
        color: 0xfff200, // Brighter yellow
        roughness: 0.4,
        metalness: 0.1,
    }); 
    const banana = new THREE.Mesh(geometry, material);
    
    // Rotate to stand up/angle nicely
    banana.rotation.z = Math.PI / 6;
    banana.position.set(0.2, 0.3, 0);
    group.add(banana);

    // Stem (Top) - Greenish brown
    // Adjusted radius to match tapered banana end (0.08 * 0.4 = 0.032)
    const stemGeometry = new THREE.CylinderGeometry(0.015, 0.032, 0.08, 5);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x6b8c23 }); 
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    
    // Position at start of curve (t=0)
    const startPoint = path.getPoint(0);
    const startTan = path.getTangent(0);
    
    // Apply group rotation compensation or add to banana mesh?
    // It's easier to add to group and position manually based on the banana's transform,
    // but here we are adding to the same group. 
    // Note: 'banana' mesh has rotation/position relative to group.
    // So if we add stem to group, we must transform the point.
    
    // Let's add stem/tip as children of the banana mesh to inherit transform!
    banana.add(stem);
    stem.position.copy(startPoint);
    
    // Align stem with tangent. Tangent points along curve. Stem cylinder is Y-up.
    // We want stem Y to align with -Tangent (sticking out).
    const axis = new THREE.Vector3(0, 1, 0);
    stem.quaternion.setFromUnitVectors(axis, startTan.clone().negate());
    // Move it out a bit
    stem.translateY(0.04);

    // Tip (Bottom) - Brown/Black
    // Adjusted radius to match tapered banana end (0.08 * 0.4 = 0.032)
    const tipGeometry = new THREE.CylinderGeometry(0.032, 0.01, 0.05, 5);
    const tipMaterial = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    
    banana.add(tip);
    const endPoint = path.getPoint(1);
    const endTan = path.getTangent(1);
    
    tip.position.copy(endPoint);
    tip.quaternion.setFromUnitVectors(axis, endTan); // Align with tangent
    tip.translateY(0.025);

    return group;
}
