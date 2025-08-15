import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import CANNON from "cannon";

export function addGrassFloor(scene, world) {
  const loader = new GLTFLoader();
  loader.load('/models/Grass Floor.glb', (gltf) => {
    const floorBase = gltf.scene;
    floorBase.scale.set(2, 2, 2);
    const gridSize = 600;
    const tileSize = 4;
    const count = Math.floor(gridSize / tileSize);
    for (let x = 0; x < count; x++) {
      for (let z = 0; z < count; z++) { 
        const posX = x * tileSize - gridSize / 2;
        const posZ = z * tileSize - gridSize / 2;
        const clone = floorBase.clone();
        clone.position.set(posX, 0, posZ);
        scene.add(clone);
      }
    }
  });

  loader.load('/models/Grass Patch.glb', (gltf) => {
    const grass = gltf.scene;
    grass.scale.set(10 , 4, 10);
    const centerSize = 250;
    const gridStep = 20; 
    for (let x = -centerSize/2; x <= centerSize/2; x += gridStep) {
      for (let z = -centerSize/2; z <= centerSize/2; z += gridStep) {
        const clone = grass.clone();
        clone.position.set(x, 1.25, z);
        scene.add(clone);
      }
    }
  
    const area = 200;
    const numPatches = 100;
    for (let i = 0; i < numPatches; i++) {
      const x = Math.random() * 2 * area - area;
      const z = Math.random() * 2 * area - area;
      if (Math.abs(x) < centerSize/2 && Math.abs(z) < centerSize/2) continue;
      const clone = grass.clone();
      clone.position.set(x, 1.25, z);
      scene.add(clone);
    }
  });

  // Ground physics
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({
    mass: 0, // mass = 0 makes the body static
    shape: groundShape,
});
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate the ground plane
groundBody.position.y = 0; // Set the ground plane at y=0
world.addBody(groundBody);
} 