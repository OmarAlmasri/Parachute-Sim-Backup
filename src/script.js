import "../style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FlyControls } from "three/examples/jsm/controls/FlyControls";
import * as dat from "dat.gui";
import { gsap } from "gsap";
import CANNON, { Vec3 } from "cannon";

// Import modules
// import { addGrassFloor } from "./grass.js";
import { createSun } from "./sun.js";
import { addGrassFloor } from './grass.js';
import { addWoodAndTrees } from './sides.js';
import { addPlatform } from './platform.js';
import { setupFlyCamera } from './flyCamera.js';
import { setupCustomCamera } from './customCamera.js';
import { addPerson } from "./person.js";
import { createParachutePhysics } from "./parachutePhysics.js";
import { PhysicsControls } from "./physicsControls.js";
import { WindVisualization } from "./windVisualization.js";

// Canvas
const canvas = document.querySelector("canvas.webgl");


/**
 * Physics
 */
// World
const world = new CANNON.World();
world.gravity.set(0, -9.81, 0); // Use standard gravity
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;
world.defaultContactMaterial.friction = 0.7;
world.defaultContactMaterial.restitution = 0.01;

//collision between skydiver and the ground (ضفناه بعد ما ضفناهن)
const defaultMaterial = new CANNON.Material("default");
const defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.7,       // Increased ground friction
    restitution: 0.01,   // Near-zero but not exactly 0 (more stable than 0)
    contactEquationStiffness: 1e8,  // Harder contacts
    contactEquationRelaxation: 4,    // Faster settling
  }
);
world.defaultContactMaterial = defaultContactMaterial;


/**
 * Textures - Keeping texture loading in main file as requested
 */
const textureLoader = new THREE.TextureLoader()
//Sun
const sunGlowTexture = textureLoader.load('/textures/sun/glow.jpg')

/**
 * Scene
 */
const scene = new THREE.Scene();

// إضافة الضباب (fog) بلون قريب من لون الخلفية
scene.fog = new THREE.Fog('#87ceeb', 100, 400);

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};





// Lights
// Ambient light
const ambientLight = new THREE.AmbientLight("#b9d5ff", 0.75);
scene.add(ambientLight);

// Create sun using module
const { sunLight, sunGlow } = createSun(sunGlowTexture);
scene.add(sunLight);
scene.add(sunGlow);

// After creating the scene
addGrassFloor(scene, world);
// addRiver(scene);
addWoodAndTrees(scene);
addPlatform(scene, world);
const person = addPerson(scene, world);

// Create wind visualization
const windVisualization = new WindVisualization(scene, 5, 0);

// Create parachute physics system
const parachutePhysics = createParachutePhysics(world, 80);
const physicsControls = new PhysicsControls(parachutePhysics, world, windVisualization);



// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1000
);

camera.position.set(20, 1.5, 30);
scene.add(camera);

// Controls
// OrbitControls (commented for later use)
// const controls = new OrbitControls(camera, canvas);
// controls.enableDamping = true;

// FlyControls (commented for later use)
// const controls = setupFlyCamera(camera, canvas);

// Custom Camera Controls (active)
const controls = setupCustomCamera(camera, canvas);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor("#87ceeb");

// Axes helper for debugging
const axesHelper = new THREE.AxesHelper(250);
axesHelper.position.set(-125, 0, -125);
axesHelper.rotation.set(0, Math.PI * 2, 0);
scene.add(axesHelper);

const axesHelper2 = new THREE.AxesHelper(250);
axesHelper2.position.set(126, 0.01, 125);
axesHelper2.rotation.set(0, Math.PI, 0);
scene.add(axesHelper2);

// Event handlers
window.onload = () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
};

// Resize event
window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Keyboard controls for parachute deployment
window.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "Space":
      event.preventDefault();
      if (person && person.deployParachute) {
        person.deployParachute();
        // Also deploy in physics system
        if (parachutePhysics) {
          parachutePhysics.deployParachute();
        }
      }
      break;
    case "KeyR":
      if (physicsControls) {
        physicsControls.resetSimulation();
        // Reset person completely
        if (person && person.resetPerson) {
          person.resetPerson();
        }
      }
      break;
  }
});

// Coordinates
const coordsDiv = document.getElementById('coords');

// Animation loop
const clock = new THREE.Clock();
function animate() {
  setTimeout(function () {
    requestAnimationFrame(animate);
  }, 0);

  const deltaTime = clock.getDelta();

  // Step the physics world
  world.step(deltaTime);

  // Update person animations and physics
  if (person && person.update) {
    person.update(deltaTime);

    // Debug physics body state
    if (person.getPhysicsBody) {
      const physicsBody = person.getPhysicsBody();
      if (physicsBody) {
        // Log physics state every few seconds for debugging
        if (Math.random() < 0.01) { // ~1% chance per frame
          console.log("Physics Debug - Position:", physicsBody.position,
            "Velocity:", physicsBody.velocity,
            "Is sleeping:", physicsBody.sleepState);
        }
      }
    }
  }

  // Update parachute physics
  if (parachutePhysics && person && person.getPhysicsBody) {
    const physicsBody = person.getPhysicsBody();
    if (physicsBody) {
      parachutePhysics.update(deltaTime, physicsBody);

      // Update physics controls display
      physicsControls.updateDisplay();

      // Update parachute model if deployed
      if (person.isParachuteDeployed && person.getParachuteModel) {
        const parachuteModel = person.getParachuteModel();
        if (parachuteModel) {
          const physicsState = parachutePhysics.getPhysicsState();
          if (physicsState.state === 'opening') {
            const openingProgress = (Date.now() - parachutePhysics.parachuteDeployTime) / (parachutePhysics.openingDuration * 1000);
            parachuteModel.updateOpeningProgress(openingProgress);
          }
        }
      }
    }
  }

  // Update wind visualization
  if (windVisualization) {
    windVisualization.update(deltaTime);
  }

  // Update Custom Camera Controls
  controls.update();
  renderer.render(scene, camera);

  //Update the coordinates with safety check
  if (camera.position && !isNaN(camera.position.x)) {
    coordsDiv.innerText =
      `x:${camera.position.x.toFixed(0)} | y:${camera.position.y.toFixed(0)} | z:${camera.position.z.toFixed(0)}`;
  } else {
    coordsDiv.innerText = "x:0 | y:0 | z:0";
  }
}

animate();
