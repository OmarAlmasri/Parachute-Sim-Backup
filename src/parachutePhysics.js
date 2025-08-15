import * as THREE from "three";
import CANNON, { Vec3 } from "cannon";

// Physics constants from the guide
export const PHYSICS_CONSTANTS = {
    // Environmental
    GRAVITY: 9.81,                    // m/s²
    SEA_LEVEL_TEMP: 15,              // °C
    SEA_LEVEL_PRESSURE: 101325,      // Pa
    TEMP_LAPSE_RATE: 0.0065,         // °C/m
    AIR_MOLAR_MASS: 0.02897,         // kg/mol
    GAS_CONSTANT: 8.314,             // J/(mol*K)

    // Drag Coefficients
    DRAG_COEFF_VERTICAL_FREEFALL: 0.7,
    DRAG_COEFF_VERTICAL_PARACHUTE: 1.75,
    DRAG_COEFF_HORIZONTAL_FREEFALL: 1.0,
    DRAG_COEFF_HORIZONTAL_PARACHUTE: 1.2,

    // Typical Values
    PARACHUTIST_MASS: 80,            // kg
    PARACHUTIST_AREA: 0.7,           // m²
    PARACHUTE_AREA_ROUND: 50,        // m²
    PARACHUTE_AREA_RECT: 25          // m²
};

// Parachute states
export const ParachuteState = {
    FREEFALL: 'freefall',
    OPENING: 'opening',
    DEPLOYED: 'deployed'
};

export class ParachutePhysics {
    constructor(world, mass = PHYSICS_CONSTANTS.PARACHUTIST_MASS) {
        this.world = world;
        this.mass = mass;
        this.state = ParachuteState.FREEFALL;

        // Physics properties
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.position = new THREE.Vector3();
        this.altitude = 0;

        // Parachute properties
        this.parachuteOpen = false;
        this.parachuteArea = 0;
        this.dragCoeffVertical = PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_FREEFALL;
        this.dragCoeffHorizontal = PHYSICS_CONSTANTS.DRAG_COEFF_HORIZONTAL_FREEFALL;

        // Environmental conditions
        this.temperature = PHYSICS_CONSTANTS.SEA_LEVEL_TEMP;
        this.pressure = PHYSICS_CONSTANTS.SEA_LEVEL_PRESSURE;
        this.airDensity = this.calculateAirDensity(this.pressure, this.temperature);

        // Wind simulation
        this.windVelocity = new THREE.Vector3(0, 0, 0);
        this.windStrength = 5; // m/s
        this.windDirection = 0; // radians

        // Timing
        this.lastTime = 0;
        this.parachuteDeployTime = 0;
        this.openingDuration = 2.0; // seconds

        // Terminal velocity tracking
        this.terminalVelocity = this.calculateTerminalVelocity();
    }

    // Environmental calculations
    calculateTemperature(altitude) {
        return PHYSICS_CONSTANTS.SEA_LEVEL_TEMP - PHYSICS_CONSTANTS.TEMP_LAPSE_RATE * altitude;
    }

    calculatePressure(altitude, temperature) {
        const tempKelvin = temperature + 273.15;
        const exponent = -PHYSICS_CONSTANTS.AIR_MOLAR_MASS * PHYSICS_CONSTANTS.GRAVITY * altitude /
            (PHYSICS_CONSTANTS.GAS_CONSTANT * tempKelvin);
        return PHYSICS_CONSTANTS.SEA_LEVEL_PRESSURE * Math.exp(exponent);
    }

    calculateAirDensity(pressure, temperature) {
        const tempKelvin = temperature + 273.15;
        return (pressure * PHYSICS_CONSTANTS.AIR_MOLAR_MASS) /
            (PHYSICS_CONSTANTS.GAS_CONSTANT * tempKelvin);
    }

    // Force calculations
    calculateGravity() {
        return new THREE.Vector3(0, -this.mass * PHYSICS_CONSTANTS.GRAVITY, 0);
    }

    calculateDrag(velocity, area, dragCoeff) {
        const velocityMagnitude = velocity.length();
        if (velocityMagnitude === 0) return new THREE.Vector3(0, 0, 0);

        const dragMagnitude = 0.5 * dragCoeff * area * this.airDensity * velocityMagnitude * velocityMagnitude;
        const dragDirection = velocity.clone().normalize().multiplyScalar(-1);

        return dragDirection.multiplyScalar(dragMagnitude);
    }

    calculateWind() {
        // Fixed wind direction (no more random changes)
        this.windVelocity.x = Math.cos(this.windDirection) * this.windStrength;
        this.windVelocity.z = Math.sin(this.windDirection) * this.windStrength;

        // Only apply wind when parachute is open and we're in the air
        if (!this.parachuteOpen || this.altitude <= 5) {
            return new THREE.Vector3(0, 0, 0);
        }

        const relativeVelocity = this.windVelocity.clone().sub(this.velocity);
        const windArea = this.parachuteOpen ? this.parachuteArea : PHYSICS_CONSTANTS.PARACHUTIST_AREA;

        return this.calculateDrag(relativeVelocity, windArea, this.dragCoeffHorizontal);
    }

    calculateTension() {
        if (!this.parachuteOpen) return new THREE.Vector3(0, 0, 0);

        // During opening phase, tension varies
        if (this.state === ParachuteState.OPENING) {
            const openingProgress = (Date.now() - this.parachuteDeployTime) / (this.openingDuration * 1000);
            const tensionFactor = Math.min(openingProgress, 1.0);
            return new THREE.Vector3(0, this.mass * PHYSICS_CONSTANTS.GRAVITY * tensionFactor, 0);
        }

        // After stabilization
        return new THREE.Vector3(0, this.mass * PHYSICS_CONSTANTS.GRAVITY, 0);
    }

    calculateTerminalVelocity() {
        const area = this.parachuteOpen ? this.parachuteArea : PHYSICS_CONSTANTS.PARACHUTIST_AREA;
        const dragCoeff = this.parachuteOpen ?
            PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_PARACHUTE :
            PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_FREEFALL;

        return Math.sqrt((2 * this.mass * PHYSICS_CONSTANTS.GRAVITY) /
            (this.airDensity * area * dragCoeff));
    }

    // Parachute deployment
    deployParachute() {
        if (this.state !== ParachuteState.FREEFALL) return;

        this.state = ParachuteState.OPENING;
        this.parachuteOpen = true;
        this.parachuteDeployTime = Date.now();

        // Set parachute area (round parachute)
        this.parachuteArea = PHYSICS_CONSTANTS.PARACHUTE_AREA_ROUND;

        // Update drag coefficients
        this.dragCoeffVertical = PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_PARACHUTE;
        this.dragCoeffHorizontal = PHYSICS_CONSTANTS.DRAG_COEFF_HORIZONTAL_PARACHUTE;

        console.log('Parachute deployed!');
    }

    // Main physics update
    update(deltaTime, cannonBody) {
        // Update time
        const currentTime = Date.now();
        const dt = deltaTime;

        // Update environmental conditions based on altitude
        this.altitude = cannonBody.position.y;
        this.temperature = this.calculateTemperature(this.altitude);
        this.pressure = this.calculatePressure(this.altitude, this.temperature);
        this.airDensity = this.calculateAirDensity(this.pressure, this.temperature);

        // Check if parachute opening phase is complete
        if (this.state === ParachuteState.OPENING) {
            const openingProgress = (currentTime - this.parachuteDeployTime) / (this.openingDuration * 1000);
            if (openingProgress >= 1.0) {
                this.state = ParachuteState.DEPLOYED;
                console.log('Parachute fully deployed');
            }
        }

        // Get current velocity from cannon body
        this.velocity.set(
            cannonBody.velocity.x,
            cannonBody.velocity.y,
            cannonBody.velocity.z
        );

        // Only apply parachute physics when actually falling (not on ground)
        if (this.altitude > 5 && this.parachuteOpen) {
            // Calculate drag force only (don't override gravity)
            const dragForce = this.calculateDrag(
                this.velocity,
                this.parachuteOpen ? this.parachuteArea : PHYSICS_CONSTANTS.PARACHUTIST_AREA,
                this.dragCoeffVertical
            );

            // Calculate wind force (only when parachute is open)
            const windForce = this.calculateWind();

            // Combine forces
            const totalForce = new THREE.Vector3();
            totalForce.add(dragForce);
            totalForce.add(windForce);

            // Apply combined force to physics body
            cannonBody.applyForce(
                new Vec3(totalForce.x, totalForce.y, totalForce.z),
                cannonBody.position
            );

            // Log parachute effect
            if (currentTime - this.lastTime > 1000) {
                console.log(`Parachute active - Altitude: ${this.altitude.toFixed(1)}m, ` +
                    `Velocity: ${this.velocity.length().toFixed(1)}m/s, ` +
                    `Drag Force: ${dragForce.length().toFixed(1)}N, ` +
                    `Wind Force: ${windForce.length().toFixed(1)}N`);
                this.lastTime = currentTime;
            }
        }

        // Update terminal velocity
        this.terminalVelocity = this.calculateTerminalVelocity();

        // Update position reference
        this.position.copy(cannonBody.position);
    }

    // Get current physics state
    getPhysicsState() {
        return {
            state: this.state,
            altitude: this.altitude,
            velocity: this.velocity.clone(),
            acceleration: this.acceleration.clone(),
            terminalVelocity: this.terminalVelocity,
            airDensity: this.airDensity,
            temperature: this.temperature,
            pressure: this.pressure,
            parachuteOpen: this.parachuteOpen
        };
    }

    // Set wind conditions
    setWind(strength, direction) {
        this.windStrength = Math.max(0, strength); // Ensure wind strength is never negative
        this.windDirection = direction;

        // If wind is very weak, disable it completely
        if (this.windStrength < 0.5) {
            this.windStrength = 0;
        }

        console.log(`Wind set to: ${this.windStrength.toFixed(1)} m/s at ${(this.windDirection * 180 / Math.PI).toFixed(1)}°`);
    }

    // Disable wind completely
    disableWind() {
        this.windStrength = 0;
        this.windDirection = 0;
        console.log('Wind disabled');
    }

    // Reset physics state
    reset() {
        this.state = ParachuteState.FREEFALL;
        this.parachuteOpen = false;
        this.parachuteArea = 0;
        this.dragCoeffVertical = PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_FREEFALL;
        this.dragCoeffHorizontal = PHYSICS_CONSTANTS.DRAG_COEFF_HORIZONTAL_FREEFALL;
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.terminalVelocity = this.calculateTerminalVelocity();
        this.parachuteDeployTime = 0;

        console.log('Parachute physics reset to freefall state');
    }
}

// Utility functions for external use
export function createParachutePhysics(world, mass) {
    return new ParachutePhysics(world, mass);
}

export function calculateFreefallTime(initialHeight, finalHeight = 0) {
    // Simple freefall time calculation (ignoring air resistance for simplicity)
    const height = initialHeight - finalHeight;
    return Math.sqrt((2 * height) / PHYSICS_CONSTANTS.GRAVITY);
}

export function calculateLandingSpeed(initialHeight, finalHeight = 0) {
    // Simple landing speed calculation (ignoring air resistance for simplicity)
    const height = initialHeight - finalHeight;
    return Math.sqrt(2 * PHYSICS_CONSTANTS.GRAVITY * height);
}
