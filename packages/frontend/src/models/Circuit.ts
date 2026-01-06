import * as THREE from "three";
import { TrackConfig } from "../simulation/types.ts";
import {
    trackFragmentShader,
    trackVertexShader,
} from "../shaders/proceduralMaterials.ts";
// import { RNG } from "./RNG.ts";

export class Circuit {
    public curve: THREE.CatmullRomCurve3;
    public mesh: THREE.Mesh;
    public group: THREE.Group;
    private scene: THREE.Scene;
    private config: TrackConfig;
    private trackMaterial: THREE.ShaderMaterial;
    private time: number = 0;

    constructor(
        scene: THREE.Scene,
        points: THREE.Vector3[],
        config?: TrackConfig,
    ) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.config = config || {
            condition: "Asphalt",
            speedModifier: 1.0,
            handlingModifier: 1.0,
            gripModifier: 1.0,
            roadColor: 0x333333,
            grassColor: 0x006266,
            skyColor: 0x87CEEB,
        };

        // Use provided points
        this.curve = new THREE.CatmullRomCurve3(points);
        this.curve.tension = 0.5; // Smoother curve
        this.curve.closed = true;

        this.trackMaterial = this.createTrackMaterial();
        this.mesh = this.createTrackMesh();
        this.group.add(this.mesh);

        // Add division lines
        this.createLineMarkings(-0.8);
        this.createLineMarkings(0.8);

        // Add Start/End Line
        this.createStartFinishLine();

        // Add Start Arc
        this.createStartArc();

        // Add Grass
        this.createGrass();

        this.scene.add(this.group);
    }

    public dispose() {
        this.scene.remove(this.group);
    }

    public update(deltaTime: number) {
        this.time += deltaTime;
        if (this.trackMaterial) {
            this.trackMaterial.uniforms.uTime.value = this.time;
        }
    }

    private createTrackMaterial(): THREE.ShaderMaterial {
        let trackType = 0;
        if (this.config.condition === "Dirt") trackType = 1;
        else if (this.config.condition === "Ice") trackType = 2; // Treat ICE as Snow

        return new THREE.ShaderMaterial({
            vertexShader: trackVertexShader,
            fragmentShader: trackFragmentShader,
            uniforms: {
                uTrackType: { value: trackType },
                uColor: { value: new THREE.Color(this.config.roadColor) },
                uTime: { value: 0 },
            },
            side: THREE.DoubleSide,
        });
    }

    private createLineMarkings(offset: number) {
        const divisions = 2000; // Higher resolution for dashed look
        const geometry = new THREE.BufferGeometry();
        const vertices: number[] = [];
        const width = 0.2; // Line width
        const up = new THREE.Vector3(0, 1, 0);

        // Determine line color based on track condition
        let lineColor = 0xffffff; // Default white
        if (this.config.condition === "Ice") {
            lineColor = 0x333333; // Dark grey/black for Ice/Snow
        }

        // Create dashed effect by skipping segments
        for (let i = 0; i < divisions; i++) {
            // Dash pattern: draw 3, skip 2
            if (i % 5 >= 3) continue;

            const t1 = i / divisions;
            const t2 = (i + 1) / divisions;

            // Point 1
            const p1 = this.curve.getPointAt(t1 % 1);
            const tan1 = this.curve.getTangentAt(t1 % 1).normalize();
            const side1 = new THREE.Vector3().crossVectors(tan1, up).normalize()
                .multiplyScalar(offset);
            const center1 = p1.clone().add(side1);
            const perp1 = new THREE.Vector3().crossVectors(tan1, up).normalize()
                .multiplyScalar(width / 2);

            // Point 2
            const p2 = this.curve.getPointAt(t2 % 1);
            const tan2 = this.curve.getTangentAt(t2 % 1).normalize();
            const side2 = new THREE.Vector3().crossVectors(tan2, up).normalize()
                .multiplyScalar(offset);
            const center2 = p2.clone().add(side2);
            const perp2 = new THREE.Vector3().crossVectors(tan2, up).normalize()
                .multiplyScalar(width / 2);

            // Quad vertices for this segment
            // 1L
            const v1L = center1.clone().sub(perp1);
            vertices.push(v1L.x, v1L.y + 0.02, v1L.z); // Lift slightly
            // 1R
            const v1R = center1.clone().add(perp1);
            vertices.push(v1R.x, v1R.y + 0.02, v1R.z);
            // 2L
            const v2L = center2.clone().sub(perp2);
            vertices.push(v2L.x, v2L.y + 0.02, v2L.z);

            // 2L
            vertices.push(v2L.x, v2L.y + 0.02, v2L.z);
            // 1R
            vertices.push(v1R.x, v1R.y + 0.02, v1R.z);
            // 2R
            const v2R = center2.clone().add(perp2);
            vertices.push(v2R.x, v2R.y + 0.02, v2R.z);
        }

        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3),
        );
        const material = new THREE.MeshBasicMaterial({ color: lineColor });
        const mesh = new THREE.Mesh(geometry, material);
        this.group.add(mesh);
    }

    private createStartFinishLine() {
        const t = 0;
        const width = 4.8;
        const length = 2; // Length of the strip
        const up = new THREE.Vector3(0, 1, 0);

        const p = this.curve.getPointAt(t);
        const tangent = this.curve.getTangentAt(t).normalize();
        const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

        const center = p.clone();

        // Simple white strip for now, slightly elevated
        const geometry = new THREE.PlaneGeometry(width, length);
        geometry.rotateX(-Math.PI / 2);

        const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({ color: 0xffffff }),
        );
        mesh.position.copy(center);
        mesh.position.y += 0.01;

        const quaternion = new THREE.Quaternion();
        const matrix = new THREE.Matrix4();
        // Construct matrix from basis vectors: side, up, tangent
        matrix.makeBasis(side, up, tangent);
        quaternion.setFromRotationMatrix(matrix);
        mesh.setRotationFromQuaternion(quaternion);

        // Checkboard pattern using canvas
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = "#000000";
            const s = 8;
            for (let y = 0; y < 64; y += s) {
                for (let x = 0; x < 64; x += s) {
                    if ((x / s + y / s) % 2 === 0) ctx.fillRect(x, y, s, s);
                }
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        mesh.material = new THREE.MeshBasicMaterial({ map: texture });

        this.group.add(mesh);
    }

    private createStartArc() {
        const t = 0;
        const p = this.curve.getPointAt(t);
        const tangent = this.curve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

        const width = 10.0; // Wider to accommodate curves
        const height = 4;

        const group = new THREE.Group();
        group.position.copy(p);

        // Align group
        const matrix = new THREE.Matrix4();
        matrix.makeBasis(side, up, tangent);
        group.setRotationFromQuaternion(
            new THREE.Quaternion().setFromRotationMatrix(matrix),
        );

        // Pillars
        const pillarWidth = 0.3;
        const pillarGeo = new THREE.BoxGeometry(
            pillarWidth,
            height,
            pillarWidth,
        );
        const pillarMat = new THREE.MeshBasicMaterial({ color: 0x888888 });

        const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
        leftPillar.position.set(-width / 2, height / 2, 0);

        const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
        rightPillar.position.set(width / 2, height / 2, 0);

        // Crossbar
        const barHeight = 0.5;
        const barGeo = new THREE.BoxGeometry(width + 1, barHeight, 0.4);
        const barMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(0, height, 0);

        // "START" Text or Banner
        const bannerHeight = 1.5;
        const bannerGeo = new THREE.BoxGeometry(width, bannerHeight, 0.1);

        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "#0000ff";
            ctx.fillRect(0, 0, 1024, 128);

            ctx.font = "bold 80px Arial";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("FINISH", 512, 64);
        }
        const texture = new THREE.CanvasTexture(canvas);
        const bannerMat = new THREE.MeshBasicMaterial({ map: texture });
        const banner = new THREE.Mesh(bannerGeo, bannerMat);
        banner.position.set(0, height + barHeight / 2 + bannerHeight / 2, 0);

        group.add(leftPillar);
        group.add(rightPillar);
        group.add(bar);
        group.add(banner);

        this.group.add(group);
    }

    private createGrass() {
        const geometry = new THREE.PlaneGeometry(1000, 1000);
        const material = new THREE.MeshBasicMaterial({
            color: this.config.grassColor,
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.1; // Slightly below track
        this.group.add(plane);
    }

    private createTrackMesh(): THREE.Mesh {
        const divisions = 1000; // Increased resolution
        const geometry = new THREE.BufferGeometry();
        const vertices: number[] = [];
        const indices: number[] = [];
        const width = 4.8; // Wider for 3 lanes
        const up = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i <= divisions; i++) {
            const t = i / divisions;
            const p = this.curve.getPointAt(t % 1);
            const tangent = this.curve.getTangentAt(t % 1).normalize();

            // Calculate vector perpendicular to tangent and up
            // This creates a flat road parallel to the ground
            const side = new THREE.Vector3().crossVectors(tangent, up)
                .normalize().multiplyScalar(width / 2);

            // Left and Right vertices
            const vL = p.clone().sub(side);
            const vR = p.clone().add(side);

            vertices.push(vL.x, vL.y, vL.z);
            vertices.push(vR.x, vR.y, vR.z);
        }

        for (let i = 0; i < divisions; i++) {
            const base = i * 2;
            // Triangle 1
            indices.push(base, base + 1, base + 2);
            // Triangle 2
            indices.push(base + 2, base + 1, base + 3);
        }

        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3),
        );
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        // Use the shader material
        return new THREE.Mesh(geometry, this.trackMaterial);
    }

    public getPointAt(t: number): THREE.Vector3 {
        // Handle negative numbers correctly for wrapping
        const u = (t % 1 + 1) % 1;
        return this.curve.getPointAt(u);
    }

    public getTangentAt(t: number): THREE.Vector3 {
        const u = (t % 1 + 1) % 1;
        return this.curve.getTangentAt(u);
    }

    public getTrackMask(): {
        texture: THREE.Texture;
        bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    } {
        // Compute bounds from a high-res sample of the curve
        const points = this.curve.getPoints(500);
        let minX = Infinity,
            maxX = -Infinity,
            minZ = Infinity,
            maxZ = -Infinity;
        points.forEach((p) => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minZ = Math.min(minZ, p.z);
            maxZ = Math.max(maxZ, p.z);
        });

        // Add padding
        const padding = 30;
        minX -= padding;
        maxX += padding;
        minZ -= padding;
        maxZ += padding;

        const width = maxX - minX;
        const height = maxZ - minZ;

        const resolution = 1024;
        const canvas = document.createElement("canvas");
        canvas.width = resolution;
        canvas.height = resolution;
        const ctx = canvas.getContext("2d");

        if (ctx) {
            // White = Grass, Black = Road (Mask out road)
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, resolution, resolution);

            // Draw track as black
            ctx.strokeStyle = "black";

            // Track width is 4.8. Add buffer.
            const trackWidth = 4.8;
            const buffer = 1.0;

            const scaleX = resolution / width;
            const scaleZ = resolution / height;
            // Use the average scale for line width approximation
            const scale = (scaleX + scaleZ) / 2;

            ctx.lineWidth = (trackWidth + buffer) * scale;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            ctx.beginPath();
            points.forEach((p, i) => {
                const u = (p.x - minX) / width;
                const v = (p.z - minZ) / height;

                const px = u * resolution;
                const py = (1 - v) * resolution; // Flip Y for canvas

                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        // Important: Clamp to edge so we don't repeat the track mask outside bounds
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;

        return {
            texture,
            bounds: { minX, maxX, minZ, maxZ },
        };
    }
}
