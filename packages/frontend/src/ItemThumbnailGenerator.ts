import * as THREE from "three";
import { ItemType } from "./simulation/types.ts";
import { createItemModel } from "./models/index.ts";

export class ItemThumbnailGenerator {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private cache: Map<ItemType, string> = new Map();

    constructor() {
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        this.renderer.setSize(128, 128);
        // this.renderer.outputEncoding = THREE.sRGBEncoding; // Deprecated in newer three.js, use outputColorSpace if needed

        this.scene = new THREE.Scene();

        // Setup lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 0.8, 1.2);
        this.camera.lookAt(0, 0.2, 0);
    }

    public getThumbnail(type: ItemType): string {
        if (this.cache.has(type)) {
            return this.cache.get(type)!;
        }

        // Clear previous models from scene (keep lights)
        // We know lights are at indices 0 and 1, so remove anything after
        while (this.scene.children.length > 2) {
            this.scene.remove(this.scene.children[2]);
        }

        const model = createItemModel(type);
        this.scene.add(model);

        // Adjust camera/model based on type if needed for better framing
        // For now, generic positioning

        this.renderer.render(this.scene, this.camera);
        const dataUrl = this.renderer.domElement.toDataURL("image/png");

        this.cache.set(type, dataUrl);
        return dataUrl;
    }

    public dispose() {
        this.renderer.dispose();
        this.cache.clear();
    }
}
