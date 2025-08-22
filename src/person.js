import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import CANNON, { Vec3 } from "cannon";
import { ParachuteModel } from "./parachuteModel.js";

let mixer = null;
let person = null;
let currentAnimationIndex = 0;
let animations = [];
let currentAction = null;
let nextAction = null;
let physicBody = null;
let hasPlayedLandingAnimation = false;
let hasStarted = false;
let moveStartTime = null;
let targetZ = 50;
let isJumping = false;
let parachuteModel = null;
let parachuteDeployed = false;

// Define the desired animation sequence
const ANIMATION_SEQUENCE = ['jump', 'fall', 'idle', 'land'];

export function addPerson(scene, world) {
    const loader = new GLTFLoader();
    loader.load('/models/skydiver3.glb', (gltf) => {
        person = gltf.scene;
        person.scale.set(20, 20, 20);
        person.position.set(28, 183, 200);  // Starting position - higher up
        person.rotation.y = Math.PI; // Rotate 180 degrees around Y-axis
        person.castShadow = true;

        /**
         * PHYSICS
         */
        const shape = new CANNON.Box(new Vec3(1, 2, 1));
        physicBody = new CANNON.Body({
            mass: 80,
            position: new Vec3(28, 183, 200), // Match the visual position
            shape: shape,
            fixedRotation: true,
            material: world.defaultContactMaterial
        });

        // Store initial position for reset functionality
        physicBody.userData = {
            initialPosition: new Vec3(28, 183, 200)
        };

        // Set initial state
        physicBody.velocity.set(0, 0, 0); // Start with no velocity
        physicBody.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), Math.PI);
        world.addBody(physicBody);

        // Ensure the body is active and awake
        physicBody.wakeUp();

        /**
         * ANIMATIONS
         */
        mixer = new THREE.AnimationMixer(person);
        animations = gltf.animations;
        console.log('Available animations:', animations.map(a => a.name));

        scene.add(person);

        // Create parachute model
        parachuteModel = new ParachuteModel();
        const parachuteGroup = parachuteModel.createParachute();
        scene.add(parachuteGroup);

        // Start jump after delay
        setTimeout(() => {
            isJumping = true;
            if (physicBody) {
                // Initial jump impulse - ensure the body actually moves
                physicBody.velocity.set(0, 20, -20); // Stronger upward and forward momentum
                console.log("Starting jump! Position:", physicBody.position, "Velocity:", physicBody.velocity);

                // Force the body to be active and ensure it's not sleeping
                physicBody.wakeUp();
                physicBody.sleepSpeedLimit = 0.1; // Lower sleep threshold
                physicBody.sleepTimeLimit = 0.1; // Lower sleep time threshold
            }
        }, 1000);

        // Update function for movement and animations
        person.update = (deltaTime) => {
            if (mixer) mixer.update(deltaTime);

            if (physicBody && isJumping) {
                // Keep moving forward while in the air
                physicBody.velocity.z = -20;
                physicBody.position.y = 183;
                // Update model
                person.position.copy(physicBody.position);
                person.rotation.y = Math.PI;

                // Check for landing
                if (!hasPlayedLandingAnimation && physicBody.position.y <= 3 && physicBody.velocity.y < 0) {
                    console.log('Landing triggered at height:', physicBody.position.y);
                    hasPlayedLandingAnimation = true;
                    isJumping = false;

                    // Hide parachute when landing
                    if (parachuteModel && parachuteDeployed) {
                        parachuteModel.hide();
                        parachuteDeployed = false;
                        console.log('Parachute hidden due to landing');
                    }

                    // Play landing animation
                    if (currentAction) {
                        currentAction.fadeOut(0.2);
                    }
                    currentAnimationIndex = ANIMATION_SEQUENCE.indexOf('land');
                    if (currentAnimationIndex !== -1) {
                        playNextAnimation();
                    }

                    // Stop forward movement
                    physicBody.velocity.z = 0;
                }

                // Ground contact
                if (physicBody.position.y < 1) {
                    physicBody.position.y = 1;
                    physicBody.velocity.set(0, 0, 0);
                    isJumping = false;
                }

                // Check if reached target
                if (physicBody.position.z <= targetZ) {
                    physicBody.position.z = targetZ;
                    physicBody.velocity.z = 0;
                    isJumping = false;
                }
            }
        };

        // Start animation immediately
        if (animations.length > 0) {
            hasStarted = true;
            currentAnimationIndex = 0;
            playNextAnimation();
        }
    });

    function findAnimationByName(name) {
        return animations.find(anim => anim.name.toLowerCase() === name.toLowerCase());
    }

    function playNextAnimation() {
        if (animations.length === 0) return;

        // Stop current animation with fade out
        if (currentAction) {
            currentAction.fadeOut(0.5);
        }

        // Get the desired animation clip based on the sequence
        const desiredClipName = ANIMATION_SEQUENCE[currentAnimationIndex];
        const clip = findAnimationByName(desiredClipName);

        if (!clip) {
            console.warn(`Animation "${desiredClipName}" not found in model`);
            return;
        }
        //debug animation
        console.log('Playing animation:', clip.name);

        // Create and play new action
        currentAction = mixer.clipAction(clip);

        // Set loop behavior based on animation (loops until it reaches the ground ->switches to land animation)
        if (desiredClipName === 'idle') {
            currentAction.setLoop(THREE.LoopRepeat);
            currentAction.clampWhenFinished = false;
        } else {
            currentAction.setLoop(THREE.LoopOnce);
            currentAction.clampWhenFinished = true; // Keep the last frame when finished
        }

        // Set faster time scale for fall animation
        const timeScale = desiredClipName === 'fall' ? clip.duration / 2.2 : 1;

        currentAction.reset()
            .setEffectiveTimeScale(timeScale)
            .setEffectiveWeight(1)
            .fadeIn(0.5)
            .play();

        // Listen for the animation to finish
        mixer.addEventListener('finished', function onFinished(e) {
            if (e.action === currentAction) {
                // Remove this listener to avoid multiple calls
                mixer.removeEventListener('finished', onFinished);

                // Only proceed to next animation if we haven't played the landing animation
                if (!hasPlayedLandingAnimation) {
                    // Move to next animation in sequence
                    currentAnimationIndex++;

                    // Always play the next animation unless we've reached the end
                    if (currentAnimationIndex < ANIMATION_SEQUENCE.length) {
                        playNextAnimation();
                    }
                }
            }
        });
    }

    function update(deltaTime) {
        // Update animations
        if (mixer) {
            mixer.update(deltaTime);
        }

        // Update model position based on physics body
        if (person && physicBody) {
            // If currently in jump animation, move forward
            // if (ANIMATION_SEQUENCE[currentAnimationIndex] === 'jump') {
            //     // Apply constant velocity in negative Z direction (forward)
            //     physicBody.velocity.y = 10; // Small upward jump
            //     physicBody.velocity.z = -50; // Adjust this value to control forward speed
            //     // physicBody.position.z = 190;    
            // }

            //sync physical body with the 3js model
            person.position.copy(new THREE.Vector3(
                physicBody.position.x,
                physicBody.position.y,
                physicBody.position.z
            ));
            person.quaternion.copy(new THREE.Quaternion(
                physicBody.quaternion.x,
                physicBody.quaternion.y,
                physicBody.quaternion.z,
                physicBody.quaternion.w
            ));

            // Debug: Check if physics body is actually moving
            // if (isJumping && physicBody.position.y < 199) {
            //     console.log("Physics body is moving! Y position:", physicBody.position.y);
            // }

            // Check if person is close to the ground and hasn't played landing animation yet
            if (!hasPlayedLandingAnimation && animations.length > 0) {
                // Check for landing in a range rather than exact height
                if (physicBody.position.y <= 3 && physicBody.velocity.y < 0) {
                    console.log('Triggering land animation at height:', physicBody.position.y);
                    hasPlayedLandingAnimation = true;

                    // Hide parachute when landing
                    if (parachuteModel && parachuteDeployed) {
                        parachuteModel.hide();
                        parachuteDeployed = false;
                        console.log('Parachute hidden due to landing');
                    }

                    // Stop any current animation
                    if (currentAction) {
                        currentAction.fadeOut(0.2);
                    }

                    // Force play the landing animation
                    currentAnimationIndex = ANIMATION_SEQUENCE.indexOf('land');
                    if (currentAnimationIndex !== -1) {
                        playNextAnimation();
                    }

                    // Slow down horizontal movement
                    physicBody.velocity.z *= 0.5;
                }
            }

            // Update parachute position and effects only when deployed and visible
            if (parachuteModel && parachuteDeployed && parachuteModel.isVisible) {
                parachuteModel.updatePosition(person.position);
                // parachuteModel.applyWindEffect(5, 0); // Default wind effect
                // Get wind values from physics system
                if (window.physicsControls && window.physicsControls.windControls) {
                    const windStrength = window.physicsControls.windControls.windStrength || 0;
                    const windDirection = (window.physicsControls.windControls.windDirection || 0) * (Math.PI / 180); // Convert degrees to radians
                    parachuteModel.applyWindEffect(windStrength, windDirection);
                }
            }

            // Prevent micro-bouncing when on ground
            if (physicBody.position.y < 1) {
                physicBody.velocity.set(0, 0, 0);
                physicBody.angularVelocity.set(0, 0, 0);
                physicBody.position.y = 1; // Force position to exactly 1
            }
        }
    }

    // Return functions that can be called from outside
    return {
        update,
        startAnimation: () => {
            if (!hasStarted && animations.length > 0) {
                hasStarted = true;
                currentAnimationIndex = 0;
                playNextAnimation();

                // Apply forward impulse when starting the jump
                if (physicBody) {
                    // Apply an impulse in the negative Z direction (forward)
                    const jumpForce = new Vec3(0, 20, -20); //  forward force
                    physicBody.applyImpulse(jumpForce, physicBody.position);
                }
            }
        },
        getCurrentAnimationName: () => ANIMATION_SEQUENCE[currentAnimationIndex] || 'None',
        getPhysicsBody: () => physicBody,
        resetLandingAnimation: () => {
            hasPlayedLandingAnimation = false;
            isJumping = false;

            // Reset the person's visual position to match physics body
            if (person && physicBody) {
                person.position.copy(new THREE.Vector3(
                    physicBody.position.x,
                    physicBody.position.y,
                    physicBody.position.z
                ));
            }
        },
        deployParachute: () => {
            // Don't deploy parachute if the person has landed
            if (hasPlayedLandingAnimation) {
                console.log('Cannot deploy parachute - skydiver has already landed!');
                return;
            }

            if (parachuteModel && !parachuteDeployed) {
                parachuteDeployed = true;
                parachuteModel.show();
                console.log('Parachute deployed!');
            }
        },
        hideParachute: () => {
            if (parachuteModel && parachuteDeployed) {
                parachuteModel.hide();
                parachuteDeployed = false;
                console.log('Parachute manually hidden');
            }
        },
        getParachuteModel: () => parachuteModel,
        isParachuteDeployed: () => parachuteDeployed,
        hasLanded: () => hasPlayedLandingAnimation,
        canDeployParachute: () => !hasPlayedLandingAnimation && !parachuteDeployed,
        resetPerson: () => {
            // Reset all person state
            hasPlayedLandingAnimation = false;
            isJumping = false;
            parachuteDeployed = false;
            currentAnimationIndex = 0;

            // Reset parachute model
            if (parachuteModel) {
                parachuteModel.hide();
            }

            // Reset animation
            if (mixer && currentAction) {
                currentAction.fadeOut(0.2);
                currentAction = null;
            }

            // Start fresh animation
            if (animations.length > 0) {
                currentAnimationIndex = 0;
                playNextAnimation();
            }

            // Schedule the jump to start again after a delay
            setTimeout(() => {
                isJumping = true;
                if (physicBody) {
                    // Initial jump impulse - ensure the body actually moves
                    physicBody.velocity.set(0, 20, -20); // Stronger upward and forward momentum
                    console.log("Starting jump after reset! Position:", physicBody.position, "Velocity:", physicBody.velocity);

                    // Force the body to be active and ensure it's not sleeping
                    physicBody.wakeUp();
                    physicBody.sleepSpeedLimit = 0.1; // Lower sleep threshold
                    physicBody.sleepTimeLimit = 0.1; // Lower sleep time threshold
                }
            }, 1000);

            console.log('Person state reset, jump scheduled in 1 second');
        }
    };
}