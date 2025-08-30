import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CustomPhysicsBody } from "./customPhysics.js";

export function addPlatform(scene, world) {
    const loader = new GLTFLoader();
    loader.load('/models/Platform.glb', (gltf) => {
        const platform = gltf.scene;
        platform.scale.set(50, 250, 80);
        platform.position.set(0, 312.5, 226);
        platform.rotation.y = Math.PI / 2;
        scene.add(platform);

        // Platform physics - using custom physics for static platform
        // Note: In custom physics, we handle platform collision in the physics body itself
        // The platform is represented as a collision boundary at its position
    });
}