import * as THREE from "three";
import { CustomPhysicsBody } from "./customPhysics.js";

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


  // Ground physics - using custom physics for static ground
  // Note: In custom physics, we handle ground collision in the physics body itself
  // The ground is represented as a collision boundary at y=0

  return scene
} 