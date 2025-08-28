import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import CANNON from "cannon";

export function addPlatform(scene, world) {
    const loader = new GLTFLoader();
    loader.load('/models/Platform.glb', (gltf) => {
        const platform = gltf.scene;
        platform.scale.set(50, 250, 80);
        platform.position.set(0, 312.5, 226);
        platform.rotation.y = Math.PI / 2; 
        scene.add(platform);

        const platformShape = new CANNON.Box(new CANNON.Vec3(50, 5, 80)); 
        const platformBody = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(0, 312.5, 226), 
            shape: platformShape,
            material: world.defaultMaterial 
        });

        const rotation = new CANNON.Quaternion();
        rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        platformBody.quaternion.copy(rotation);

        // Add the platform body to the physics world
        world.addBody(platformBody);
    });
}