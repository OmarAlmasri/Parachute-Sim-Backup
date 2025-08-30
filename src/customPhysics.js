import * as THREE from "three";

// Physics constants
const GRAVITY = 9.81; // m/s²
const GROUND_LEVEL = 1; // Minimum Y position
const BOUNDARY_X = 100; // X boundary limits
const BOUNDARY_Z = 200; // Z boundary limits
const AIR_RESISTANCE = 0.02; // Air resistance coefficient
const FRICTION = 0.8; // Ground friction coefficient
const RESTITUTION = 0.1; // Bounce factor

export class CustomPhysicsBody {
    constructor(mass = 80, initialPosition = new THREE.Vector3(0, 455, 185)) {
        this.mass = mass;
        this.position = initialPosition.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.force = new THREE.Vector3(0, 0, 0);
        this.quaternion = new THREE.Quaternion();
        this.angularVelocity = new THREE.Vector3(0, 0, 0);

        // Physics properties
        this.isActive = true;
        this.fixedRotation = true;
        this.boundingBox = new THREE.Box3();
        this.boundingBox.setFromCenterAndSize(
            this.position,
            new THREE.Vector3(2, 4, 2) // Width, height, depth
        );

        // Store initial position for reset
        this.initialPosition = initialPosition.clone();

        // Physics state
        this.onGround = false;
        this.lastGroundTime = 0;
        this.groundContactThreshold = 0.1; // Distance threshold for ground contact
    }

    // Apply force to the body
    applyForce(force, point = null) {
        this.force.add(force);
    }

    // Apply impulse (instantaneous change in velocity)
    applyImpulse(impulse, point = null) {
        this.velocity.add(impulse.clone().multiplyScalar(1 / this.mass));
    }

    // Update physics for one time step
    update(deltaTime) {
        if (!this.isActive) return;

        // Calculate acceleration from force: F = ma, so a = F/m
        this.acceleration.copy(this.force).multiplyScalar(1 / this.mass);

        // Add gravity
        this.acceleration.y -= GRAVITY;

        // Apply air resistance (proportional to velocity squared)
        if (this.velocity.length() > 0.1) {
            const airResistanceForce = this.velocity.clone()
                .normalize()
                .multiplyScalar(-AIR_RESISTANCE * this.velocity.lengthSq());
            this.acceleration.add(airResistanceForce.multiplyScalar(1 / this.mass));
        }

        // Update velocity: v = v₀ + at
        this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));

        // Update position: x = x₀ + v₀t + ½at²
        const positionChange = this.velocity.clone().multiplyScalar(deltaTime);
        const accelerationChange = this.acceleration.clone().multiplyScalar(0.5 * deltaTime * deltaTime);
        this.position.add(positionChange).add(accelerationChange);

        // Update quaternion if rotation is not fixed
        if (!this.fixedRotation) {
            // Simple quaternion update (can be improved for more complex rotations)
            const rotationChange = this.angularVelocity.clone().multiplyScalar(deltaTime);
            // This is a simplified approach - in practice you'd use quaternion integration
        }

        // Update bounding box
        this.boundingBox.setFromCenterAndSize(
            this.position,
            new THREE.Vector3(2, 4, 2)
        );

        // Handle collisions
        this.handleCollisions();

        // Update ground contact state
        this.updateGroundContact();

        // Reset force for next frame
        this.force.set(0, 0, 0);
    }

    // Handle collisions with ground and boundaries
    handleCollisions() {
        // Ground collision
        if (this.position.y < GROUND_LEVEL) {
            this.position.y = GROUND_LEVEL;

            // Bounce with energy loss (restitution)
            if (this.velocity.y < 0) {
                this.velocity.y = -this.velocity.y * RESTITUTION;
            }

            // Apply friction to horizontal movement when on ground
            if (this.onGround) {
                this.velocity.x *= FRICTION;
                this.velocity.z *= FRICTION;
            }
        }

        // Boundary collisions
        if (Math.abs(this.position.x) > BOUNDARY_X) {
            this.position.x = Math.sign(this.position.x) * BOUNDARY_X;
            this.velocity.x = -this.velocity.x * RESTITUTION; // Bounce back with energy loss
        }

        if (Math.abs(this.position.z) > BOUNDARY_Z) {
            this.position.z = Math.sign(this.position.z) * BOUNDARY_Z;
            this.velocity.z = -this.velocity.z * RESTITUTION; // Bounce back with energy loss
        }

        // Stop movement if velocity is very small (prevent micro-movements)
        if (this.velocity.length() < 0.1) {
            this.velocity.set(0, 0, 0);
        }
    }

    // Update ground contact state
    updateGroundContact() {
        const distanceToGround = this.position.y - GROUND_LEVEL;
        this.onGround = distanceToGround <= this.groundContactThreshold;

        if (this.onGround) {
            this.lastGroundTime = Date.now();
        }
    }

    // Wake up the body (make it active)
    wakeUp() {
        this.isActive = true;
    }

    // Put the body to sleep (make it inactive)
    sleep() {
        this.isActive = false;
    }

    // Reset to initial state
    reset() {
        this.position.copy(this.initialPosition);
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.force.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.quaternion.identity();
        this.isActive = true;
        this.onGround = false;
        this.lastGroundTime = 0;
    }

    // Get current physics state
    getPhysicsState() {
        return {
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            acceleration: this.acceleration.clone(),
            force: this.force.clone(),
            mass: this.mass,
            isActive: this.isActive,
            onGround: this.onGround
        };
    }

    // Set velocity directly
    setVelocity(velocity) {
        this.velocity.copy(velocity);
    }

    // Set position directly
    setPosition(position) {
        this.position.copy(position);
    }

    // Check if body is sleeping (inactive)
    get sleepState() {
        return this.isActive ? 0 : 1; // 0 = awake, 1 = sleeping
    }

    // Update mass properties (for when mass changes)
    updateMassProperties() {
        // In custom physics, mass affects acceleration directly
        // This method is called when mass changes to ensure proper scaling
    }

    // Get kinetic energy
    getKineticEnergy() {
        return 0.5 * this.mass * this.velocity.lengthSq();
    }

    // Get potential energy
    getPotentialEnergy() {
        return this.mass * GRAVITY * this.position.y;
    }

    // Get total mechanical energy
    getTotalEnergy() {
        return this.getKineticEnergy() + this.getPotentialEnergy();
    }
}

// Custom physics world to replace Cannon.js world
export class CustomPhysicsWorld {
    constructor() {
        this.bodies = [];
        this.gravity = new THREE.Vector3(0, -GRAVITY, 0);
        this.defaultContactMaterial = {
            friction: FRICTION,
            restitution: RESTITUTION
        };
        this.time = 0;
        this.subSteps = 1; // Number of physics substeps per frame
    }

    // Add a body to the physics world
    addBody(body) {
        this.bodies.push(body);
    }

    // Remove a body from the physics world
    removeBody(body) {
        const index = this.bodies.indexOf(body);
        if (index > -1) {
            this.bodies.splice(index, 1);
        }
    }

    // Step the physics world forward in time
    step(deltaTime) {
        this.time += deltaTime;

        // Use substeps for more stable physics
        const subStepDelta = deltaTime / this.subSteps;

        for (let i = 0; i < this.subSteps; i++) {
            // Update all bodies
            for (const body of this.bodies) {
                body.update(subStepDelta);
            }
        }
    }

    // Set gravity
    setGravity(gravity) {
        this.gravity.copy(gravity);
    }

    // Get gravity
    getGravity() {
        return this.gravity.clone();
    }

    // Get all bodies
    getBodies() {
        return this.bodies;
    }

    // Get physics world statistics
    getStats() {
        return {
            bodyCount: this.bodies.length,
            time: this.time,
            activeBodies: this.bodies.filter(b => b.isActive).length
        };
    }
}
