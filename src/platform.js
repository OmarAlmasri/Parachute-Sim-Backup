import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import CANNON from "cannon";

export function addPlatform(scene, world) {
    const loader = new GLTFLoader();
    loader.load('/models/Platform.glb', (gltf) => {
        const platform = gltf.scene;
        platform.scale.set(30, 100, 30);
        platform.position.set(28, 125, 226);
        platform.rotation.y = Math.PI / 2; // Rotate 90 degrees around Y-axis
        scene.add(platform);

        // Add physics body for the platform
        // Increase the size of the collision box to better match the visual platform
        const platformShape = new CANNON.Box(new CANNON.Vec3(30, 2, 30)); // Making it wider and longer, but thinner in height
        const platformBody = new CANNON.Body({
            mass: 0, // mass of 0 makes it static/immovable
            position: new CANNON.Vec3(28, 125, 226), // Lower the y position to be below the starting point
            shape: platformShape,
            material: world.defaultMaterial // Use the default material for proper collision
        });

        // Rotate the physics body to match the visual model
        const rotation = new CANNON.Quaternion();
        rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        platformBody.quaternion.copy(rotation);

        // Add the platform body to the physics world
        world.addBody(platformBody);

        // // Debug visualization
        // const geometry = new THREE.BoxGeometry(60, 4, 60);
        // const material = new THREE.MeshBasicMaterial({ 
        //     color: 0xff0000,
        //     wireframe: true,
        //     transparent: true,
        //     opacity: 0.3
        // });
        // const debugMesh = new THREE.Mesh(geometry, material);
        // debugMesh.position.copy(platform.position);
        // debugMesh.position.y = 175; // Match the physics body position
        // debugMesh.rotation.y = Math.PI / 2;
        // scene.add(debugMesh);
    });
}