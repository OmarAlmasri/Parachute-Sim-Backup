import * as THREE from "three";
import CANNON from "cannon";

export function addGrassFloor(scene, world) {


const loader = new THREE.TextureLoader();
const grassTexture = loader.load('/textures/grass/doubleGrass.jpg');
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(10, 10);
// grassTexture.anisotropy = 16;
const grassMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, map: grassTexture, side: THREE.DoubleSide });
const grassGeometry = new THREE.PlaneGeometry(1200, 1200);
const grass = new THREE.Mesh(grassGeometry, grassMaterial);
grass.rotation.set(-Math.PI * 0.5, 0, 0)
scene.add(grass);

 
  // Ground physics
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({
    mass: 0, // mass = 0 makes the body static
    shape: groundShape,
});
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate the ground plane
groundBody.position.y = 0; // Set the ground plane at y=0
world.addBody(groundBody);

return scene
} 