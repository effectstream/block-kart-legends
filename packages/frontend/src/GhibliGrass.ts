import * as THREE from 'three';
import vertexShader from './shaders/grassVertex.glsl?raw';
import fragmentShader from './shaders/grassFragment.glsl?raw';

// Simple 2D Perlin-like noise implementation for texture generation
class SimpleNoise {
    private perm: number[];

    constructor() {
        this.perm = new Array(512);
        const p = new Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const n = Math.floor(Math.random() * (i + 1));
            [p[i], p[n]] = [p[n], p[i]];
        }
        for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    private fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
    private lerp(t: number, a: number, b: number) { return a + t * (b - a); }
    private grad(hash: number, x: number, y: number) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    public noise(x: number, y: number) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x);
        const v = this.fade(y);
        const A = this.perm[X] + Y;
        const B = this.perm[X + 1] + Y;
        return this.lerp(v, this.lerp(u, this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y)),
            this.lerp(u, this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1)));
    }
}

export class GhibliGrass {
    private scene: THREE.Scene;
    private player: THREE.Object3D;
    private mesh: THREE.Mesh | undefined;
    private settings: any;
    private time: number = 0;
    private trackMask: { texture: THREE.Texture, bounds: { minX: number, maxX: number, minZ: number, maxZ: number } };

    constructor(scene: THREE.Scene, player: THREE.Object3D, trackMask: { texture: THREE.Texture, bounds: { minX: number, maxX: number, minZ: number, maxZ: number } }) {
        this.scene = scene;
        this.player = player;
        this.trackMask = trackMask;

        this.settings = {
            count: 150000,
            bladeHeight: 2.4, 
            bladeWidth: 0.5,
            patchSize: 200,
        };

        // Generate Textures
        const noiseTexture = this.createNoiseTexture();
        const grassTexture = this.createGrassTexture();
        const heightMap = this.createHeightMap();

        this.buildGrass(noiseTexture, grassTexture, heightMap);
    }

    private createNoiseTexture(): THREE.DataTexture {
        const size = 512;
        const data = new Uint8Array(size * size * 4);
        const noiseGen = new SimpleNoise();
        const scale = 5; // Scale of the noise pattern

        for (let i = 0; i < size * size; i++) {
            const x = (i % size) / size;
            const y = Math.floor(i / size) / size;
            
            // Generate Perlin-like noise
            const n = noiseGen.noise(x * scale, y * scale);
            // Map -1..1 to 0..255
            let val = Math.floor((n + 1) * 0.5 * 255);
            
            // Add some high-frequency static noise for height variation (so it's not too smooth)
            // But bake it into the texture so it's stable!
            const grain = (Math.random() - 0.5) * 40; 
            val = Math.max(0, Math.min(255, val + grain));

            const stride = i * 4;
            data[stride] = Math.floor(val);     // R: Height variation / baldness
            data[stride + 1] = Math.floor(val); // G: Wind X
            data[stride + 2] = Math.floor(val); // B: Wind Z
            data[stride + 3] = 255;
        }

        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.needsUpdate = true;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        return texture;
    }

    private createGrassTexture(): THREE.DataTexture {
         // Simple vertical gradient from dark green to light green
         const width = 2;
         const height = 16;
         const data = new Uint8Array(width * height * 4);
         for (let y = 0; y < height; y++) {
             const t = y / (height - 1);
             // Dark green (0, 40, 0) to Lighter Green (60, 180, 20)
             const r = Math.floor(0 + t * 60);
             const g = Math.floor(40 + t * 140);
             const b = Math.floor(0 + t * 20);
             for (let x = 0; x < width; x++) {
                 const i = (y * width + x) * 4;
                 data[i] = r;
                 data[i+1] = g;
                 data[i+2] = b;
                 data[i+3] = 255;
             }
         }
         const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
         texture.needsUpdate = true;
         return texture;
    }

    private createHeightMap(): THREE.DataTexture {
        // Flat white (high) -> displacement will be max Y?
        // Let's use 0 (min Y).
        const val = 0; 
        const texture = new THREE.DataTexture(new Uint8Array([val, val, val, 255]), 1, 1, THREE.RGBAFormat);
        texture.needsUpdate = true;
        return texture;
    }

    private buildGrass(noiseTexture: THREE.Texture, grassTexture: THREE.Texture, heightMap: THREE.Texture) {
        const positions: number[] = [];
        const colors: number[] = [];
        const uvs: number[] = [];
        // indices removed
        
        const bladeOrigins: number[] = [];
        const yaws: number[] = [];
        
        const currentPosition = new THREE.Vector3();
        const uv = new THREE.Vector2();
        const yawUnitVec = new THREE.Vector3();

        for (let i = 0; i < this.settings.count; i++) {
            currentPosition.x = THREE.MathUtils.randFloat(
                -this.settings.patchSize * 0.5,
                this.settings.patchSize * 0.5
            );

            currentPosition.z = THREE.MathUtils.randFloat(
                -this.settings.patchSize * 0.5,
                this.settings.patchSize * 0.5
            );

            // Simple UV mapping for 0-1 across patch
            uv.set(
                (currentPosition.x + this.settings.patchSize * 0.5) / this.settings.patchSize,
                (currentPosition.z + this.settings.patchSize * 0.5) / this.settings.patchSize
            );

            const yaw = Math.random() * Math.PI * 2;
            yawUnitVec.set(Math.sin(yaw), 0, -Math.cos(yaw));

            const bl = currentPosition;
            const br = currentPosition;
            const tc = currentPosition;

            const verts = [
                { pos: bl.toArray(), color: [0.1, 0, 0] },
                { pos: br.toArray(), color: [0, 0, 0.1] },
                { pos: tc.toArray(), color: [1, 1, 1] },
            ];

            verts.forEach((vert) => {
                positions.push(...vert.pos);
                colors.push(...vert.color);
                uvs.push(...uv.toArray());
                yaws.push(...yawUnitVec.toArray());
                bladeOrigins.push(...currentPosition.toArray());
            });
        }

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(positions), 3)
        );

        geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(new Float32Array(colors), 3)
        );

        geometry.setAttribute(
            "uv",
            new THREE.BufferAttribute(new Float32Array(uvs), 2)
        );

        geometry.setAttribute(
            "aYaw",
            new THREE.BufferAttribute(new Float32Array(yaws), 3)
        );

        geometry.setAttribute(
            "aBladeOrigin",
            new THREE.BufferAttribute(new Float32Array(bladeOrigins), 3)
        );

        geometry.computeVertexNormals();

        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            vertexColors: true,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: { value: 0 },
                uNoiseTexture: { value: noiseTexture },
                uDiffuseMap: { value: grassTexture },
                uPlayerPosition: { value: new THREE.Vector3() },
                uHeightMap: { value: heightMap },
                uTrackMask: { value: this.trackMask.texture },
                uBoundingBoxMin: { value: new THREE.Vector3(this.trackMask.bounds.minX, -0.1, this.trackMask.bounds.minZ) },
                uBoundingBoxMax: { value: new THREE.Vector3(this.trackMask.bounds.maxX, 0.1, this.trackMask.bounds.maxZ) },
                uPatchSize: { value: this.settings.patchSize },
                uBladeWidth: { value: this.settings.bladeWidth },
                uWindDirection: { value: Math.PI * 0.25 },
                uWindSpeed: { value: 0 }, // 0.5 },
                uWindNoiseScale: { value: 0.5 },
                uBaldPatchModifier: { value: 1.0 },
                uFalloffSharpness: { value: 0.5 },
                uHeightNoiseFrequency: { value: 2.0 },
                uHeightNoiseAmplitude: { value: 1.0 },
                uMaxBendAngle: { value: 20 },
                uMaxBladeHeight: { value: this.settings.bladeHeight },
                uRandomHeightAmount: { value: 0.0 }, // Disabled since we baked it into texture
            },
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.frustumCulled = false; // Important for infinite scrolling

        this.scene.add(this.mesh);
    }

    public update(dt: number) {
        this.time += dt;
        if (this.mesh && this.mesh.material instanceof THREE.ShaderMaterial) {
            this.mesh.material.uniforms.uTime.value = this.time;
            this.mesh.material.uniforms.uPlayerPosition.value.copy(this.player.position);
            
            // Move mesh to follow player (x,z) but keep y=0? 
            // Or y=player.y?
            // The shader subtracts uPlayerPosition.y from displacement.
            // If I move mesh.y to player.y, and pass player.y to shader.
            // Shader: transformed.y (local) += disp - player.y
            // World Y = mesh.y + transformed.y = player.y + disp - player.y = disp.
            // So World Y is fixed to 'disp' (which is from heightmap).
            // So yes, I should move mesh to player position including Y.
            this.mesh.position.copy(this.player.position);
            
            // Reset rotation to avoid rotating the grid
            this.mesh.rotation.set(0, 0, 0);
        }
    }

    public dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material instanceof THREE.Material) {
                this.mesh.material.dispose();
            } else if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(m => m.dispose());
            }
            this.mesh = undefined;
        }
    }
}
