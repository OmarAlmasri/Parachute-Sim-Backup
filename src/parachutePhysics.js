import * as THREE from "three";
import CANNON, { Vec3 } from "cannon";

// Physics constants from the guide
export const PHYSICS_CONSTANTS = {
    // Environmental
    GRAVITY: 9.81,                    // m/s²
    SEA_LEVEL_TEMP: 15,              // °C
    SEA_LEVEL_PRESSURE: 101325,      // Pa
    TEMP_LAPSE_RATE: 0.0065,         // °C/m
    AIR_MOLAR_MASS: 0.0289644,       // kg/mol (more precise value)
    GAS_CONSTANT: 8.3144598,         // J/(mol*K) (more precise value)

    // Environmental limits and validation
    MAX_ALTITUDE: 10000,             // Maximum altitude for calculations (10km)
    MIN_TEMPERATURE: -60,            // Minimum temperature (°C) for calculations
    MAX_TEMPERATURE: 50,             // Maximum temperature (°C) for calculations

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
        this.windStrength = 0; // m/s
        this.windDirection = 0; // radians

        // Timing
        this.lastTime = 0;
        this.parachuteDeployTime = 0;
        this.openingDuration = 2.0; // seconds

        // Terminal velocity tracking
        this.terminalVelocity = this.calculateTerminalVelocity().value;

        // Environmental logging
        this.lastLoggedAltitude = 0;

        // Velocity milestone flags
        this.milestone50Logged = false;
        this.milestone100Logged = false;
        this.milestone150Logged = false;

        // Terminal velocity logging flags
        this.terminalVelocityLogged = false;
        this.atTerminalVelocityLogged = false;
        this.exceedingTerminalVelocityLogged = false;
    }

    // Environmental calculations
    calculateTemperature(altitude) {
        // Ensure altitude is within reasonable bounds for calculations
        const safeAltitude = Math.max(0, Math.min(altitude, PHYSICS_CONSTANTS.MAX_ALTITUDE));
        const temperature = PHYSICS_CONSTANTS.SEA_LEVEL_TEMP - PHYSICS_CONSTANTS.TEMP_LAPSE_RATE * safeAltitude;

        // Clamp temperature to reasonable bounds
        return Math.max(PHYSICS_CONSTANTS.MIN_TEMPERATURE,
            Math.min(temperature, PHYSICS_CONSTANTS.MAX_TEMPERATURE));
    }

    calculatePressure(altitude, temperature) {
        const tempKelvin = temperature + 273.15;
        const safeAltitude = Math.max(0, altitude);

        // Use the International Standard Atmosphere (ISA) model for better accuracy
        // This is the standard used by aviation and meteorology
        const exponent = -PHYSICS_CONSTANTS.AIR_MOLAR_MASS * PHYSICS_CONSTANTS.GRAVITY * safeAltitude /
            (PHYSICS_CONSTANTS.GAS_CONSTANT * tempKelvin);

        // Apply ISA correction factors for better accuracy at higher altitudes
        let pressure = PHYSICS_CONSTANTS.SEA_LEVEL_PRESSURE * Math.exp(exponent);

        // ISA correction for altitudes above 1000m
        if (safeAltitude > 1000) {
            const correctionFactor = 1 + (safeAltitude - 1000) * 0.0001;
            pressure *= correctionFactor;
        }

        return pressure;
    }

    calculateAirDensity(pressure, temperature) {
        const tempKelvin = temperature + 273.15;

        // Use the ideal gas law from the physics guide: ρ = (P * M) / (R * T)
        return (pressure * PHYSICS_CONSTANTS.AIR_MOLAR_MASS) /
            (PHYSICS_CONSTANTS.GAS_CONSTANT * tempKelvin);
    }

    // Enhanced environmental state calculation
    updateEnvironmentalConditions(altitude) {
        this.altitude = altitude;
        this.temperature = this.calculateTemperature(altitude);

        // Use ISA standard atmosphere calculation (most accurate)
        this.pressure = this.calculatePressureISA(altitude);
        this.airDensity = this.calculateAirDensity(this.pressure, this.temperature);

        // Log environmental changes for debugging (commented out for production)
        // if (Math.abs(altitude - this.lastLoggedAltitude) > 10) { // Log every 10m change
        //     console.log(`Altitude: ${altitude.toFixed(1)}m, ` +
        //         `Temperature: ${this.temperature.toFixed(1)}°C, ` +
        //         `Pressure: ${(this.pressure / 1000).toFixed(1)}kPa, ` +
        //         `Air Density: ${this.airDensity.toFixed(3)}kg/m³`);
        //     this.lastLoggedAltitude = altitude;
        // }
    }

    // Alternative ISA pressure calculation (more accurate for standard conditions)
    calculatePressureISA(altitude) {
        const safeAltitude = Math.max(0, altitude);

        // ISA standard atmosphere formula
        // P = P₀ * (1 - 0.0065 * h / T₀)^5.256
        // where T₀ = 288.15K (15°C)
        const T0 = 288.15; // Sea level temperature in Kelvin
        const L = 0.0065;  // Temperature lapse rate K/m
        const g = 9.80665; // Standard gravity m/s²
        const M = 0.0289644; // Molar mass of air kg/mol
        const R = 8.3144598; // Universal gas constant J/(mol·K)

        const exponent = (g * M) / (R * L);
        const pressure = PHYSICS_CONSTANTS.SEA_LEVEL_PRESSURE *
            Math.pow(1 - (L * safeAltitude) / T0, exponent);

        return pressure;
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
        // Determine area and drag coefficient based on CURRENT STATE, not just parachuteOpen
        let area, dragCoeff;

        if (this.state === ParachuteState.FREEFALL) {
            // Freefall state - use skydiver values
            area = PHYSICS_CONSTANTS.PARACHUTIST_AREA;
            dragCoeff = PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_FREEFALL;
        } else if (this.state === ParachuteState.OPENING || this.state === ParachuteState.DEPLOYED) {
            // Parachute state - use parachute values
            area = this.parachuteArea || PHYSICS_CONSTANTS.PARACHUTE_AREA_ROUND;
            dragCoeff = PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_PARACHUTE;
        } else {
            // Fallback to freefall values
            area = PHYSICS_CONSTANTS.PARACHUTIST_AREA;
            dragCoeff = PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_FREEFALL;
        }

        // Calculate terminal velocity using current air density
        const terminalVelocity = Math.sqrt((2 * this.mass * PHYSICS_CONSTANTS.GRAVITY) /
            (this.airDensity * area * dragCoeff));

        // Return detailed analysis
        return {
            value: terminalVelocity,
            area: area,
            dragCoeff: dragCoeff,
            airDensity: this.airDensity,
            mass: this.mass,
            gravity: PHYSICS_CONSTANTS.GRAVITY,
            state: this.state,
            parachuteOpen: this.parachuteOpen
        };
    }

    // Add a method to get terminal velocity analysis
    getTerminalVelocityAnalysis() {
        const analysis = this.calculateTerminalVelocity();
        const currentVelocity = this.velocity.length();
        const velocityRatio = currentVelocity / analysis.value;

        return {
            ...analysis,
            currentVelocity: currentVelocity,
            velocityRatio: velocityRatio,
            altitude: this.altitude, // Add current altitude
            // Fix logic: approaching terminal means current velocity is getting close to terminal
            approachingTerminal: velocityRatio >= 0.8 && velocityRatio <= 1.1, // 80% to 110% of terminal
            atTerminal: velocityRatio >= 0.95 && velocityRatio <= 1.05, // 95% to 105% of terminal
            exceedingTerminal: velocityRatio > 1.1, // Exceeding terminal velocity
            belowTerminal: velocityRatio < 0.8 // Below terminal velocity
        };
    }

    // Parachute deployment
    deployParachute() {
        // Don't deploy if already deployed or opening
        if (this.state !== ParachuteState.FREEFALL) return;

        // Don't deploy if on the ground (altitude too low)
        if (this.altitude <= 5) {
            console.log('Cannot deploy parachute - skydiver is too close to the ground!');
            return;
        }

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

        // Update environmental conditions based on altitude using the new function
        this.updateEnvironmentalConditions(cannonBody.position.y);

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

            // Log parachute effect (commented out for production)
            // if (currentTime - this.lastTime > 1000) {
            //     console.log(`Parachute active - Altitude: ${this.altitude.toFixed(1)}m, ` +
            //         `Velocity: ${this.velocity.length().toFixed(1)}m/s, ` +
            //         `Drag Force: ${dragForce.length().toFixed(1)}N, ` +
            //         `Wind Force: ${windForce.length().toFixed(1)}N`);
            //     this.lastTime = currentTime;
            // }
        }

        // Update terminal velocity
        this.terminalVelocity = this.calculateTerminalVelocity().value;

        // Check terminal velocity status
        const analysis = this.getTerminalVelocityAnalysis();

        // Log when approaching terminal velocity (commented out for production)
        // if (analysis.approachingTerminal && !this.terminalVelocityLogged) {
        //     console.log(`🚀 Approaching terminal velocity: ${analysis.currentVelocity.toFixed(1)}m/s / ${analysis.value.toFixed(1)}m/s (${(analysis.velocityRatio * 100).toFixed(1)}%)`);
        //     this.terminalVelocityLogged = true;
        // }

        // Log when at terminal velocity (commented out for production)
        // if (analysis.atTerminal && !this.atTerminalVelocityLogged) {
        //     console.log(`⚡ At terminal velocity: ${analysis.currentVelocity.toFixed(1)}m/s (Air density: ${this.airDensity.toFixed(3)}kg/m³)`);
        //     this.atTerminalVelocityLogged = true;
        // }

        // Log when exceeding terminal velocity (commented out for production)
        // if (analysis.exceedingTerminal && !this.exceedingTerminalLogged) {
        //     console.log(`⚠️ Exceeding terminal velocity: ${analysis.currentVelocity.toFixed(1)}m/s / ${analysis.value.toFixed(1)}m/s (${(analysis.velocityRatio * 100).toFixed(1)}%)`);
        //     this.exceedingTerminalLogged = true;
        // }

        // Reset flags when velocity drops significantly below terminal
        if (analysis.belowTerminal) {
            this.terminalVelocityLogged = false;
            this.atTerminalVelocityLogged = false;
            this.exceedingTerminalLogged = false;
        }

        // Update position reference
        this.position.copy(cannonBody.position);

        // Log velocity milestones for educational purposes (commented out for production)
        // this.logVelocityMilestones();
    }

    // Get current physics state
    getPhysicsState() {
        return {
            state: this.state,
            altitude: this.altitude,
            velocity: this.velocity.clone(),
            acceleration: this.acceleration.clone(),
            terminalVelocity: this.terminalVelocity,
            terminalVelocityAnalysis: this.getTerminalVelocityAnalysis(),
            airDensity: this.airDensity,
            temperature: this.temperature,
            pressure: this.pressure,
            parachuteOpen: this.parachuteOpen
        };
    }

    // Check if parachute can be deployed
    canDeployParachute() {
        return this.state === ParachuteState.FREEFALL && this.altitude > 5;
    }

    // Get detailed environmental information
    getEnvironmentalInfo() {
        return {
            altitude: this.altitude,
            temperature: this.temperature,
            pressure: this.pressure,
            airDensity: this.airDensity,
            temperatureFahrenheit: (this.temperature * 9 / 5) + 32,
            pressurePSI: this.pressure / 6894.76, // Convert Pa to PSI
            airDensityLbPerCubicFt: this.airDensity * 0.062428 // Convert kg/m³ to lb/ft³
        };
    }

    // Get altitude-based terminal velocity analysis
    getAltitudeTerminalVelocityAnalysis() {
        const altitudes = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
        const analysis = [];

        altitudes.forEach(alt => {
            const temp = this.calculateTemperature(alt);
            const pressure = this.calculatePressureISA(alt);
            const airDensity = this.calculateAirDensity(pressure, temp);

            // Calculate terminal velocity for both freefall and parachute states
            const freefallTerminal = Math.sqrt((2 * this.mass * PHYSICS_CONSTANTS.GRAVITY) /
                (airDensity * PHYSICS_CONSTANTS.PARACHUTIST_AREA * PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_FREEFALL));

            const parachuteTerminal = Math.sqrt((2 * this.mass * PHYSICS_CONSTANTS.GRAVITY) /
                (airDensity * (this.parachuteArea || PHYSICS_CONSTANTS.PARACHUTE_AREA_ROUND) *
                    PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_PARACHUTE));

            analysis.push({
                altitude: alt,
                temperature: temp,
                pressure: pressure,
                airDensity: airDensity,
                freefallTerminal: freefallTerminal,
                parachuteTerminal: parachuteTerminal
            });
        });

        return analysis;
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



    // Validate environmental calculations (commented out for production)
    /*
    validateEnvironmentalCalculations() {
        const testAltitudes = [0, 1000, 5000, 10000];
        console.log('=== Environmental Physics Validation ===');

        testAltitudes.forEach(altitude => {
            const temp = this.calculateTemperature(altitude);
            const pressure = this.calculatePressure(altitude, temp);
            const density = this.calculateAirDensity(pressure, temp);

            console.log(`Altitude ${altitude}m: ` +
                `T=${temp.toFixed(1)}°C, ` +
                `P=${(pressure / 1000).toFixed(1)}kPa, ` +
                `ρ=${density.toFixed(3)}kg/m³`);
        });

        console.log('=== Validation Complete ===');
    }
    */

    // Reset physics state
    reset() {
        this.state = ParachuteState.FREEFALL;
        this.parachuteOpen = false;
        this.parachuteArea = 0;
        this.dragCoeffVertical = PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_FREEFALL;
        this.dragCoeffHorizontal = PHYSICS_CONSTANTS.DRAG_COEFF_HORIZONTAL_FREEFALL;
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        this.terminalVelocity = this.calculateTerminalVelocity().value;
        this.parachuteDeployTime = 0;
        this.lastLoggedAltitude = 0;

        // Reset terminal velocity logging flags
        this.terminalVelocityLogged = false;
        this.atTerminalVelocityLogged = false;
        this.exceedingTerminalVelocityLogged = false;

        // Reset velocity milestone flags
        this.milestone50Logged = false;
        this.milestone100Logged = false;
        this.milestone150Logged = false;

        console.log('Parachute physics reset to freefall state');
    }

    // Log velocity milestones for educational purposes (commented out for production)
    /*
    logVelocityMilestones() {
        const analysis = this.getTerminalVelocityAnalysis();
        const currentVelocity = analysis.currentVelocity;
        const terminalVelocity = analysis.value;
        const ratio = analysis.velocityRatio;

        // Log different velocity milestones
        if (currentVelocity > 50 && !this.milestone50Logged) {
            console.log(`🎯 Velocity milestone: 50 m/s reached! (${(ratio * 100).toFixed(1)}% of terminal velocity)`);
            this.milestone50Logged = true;
        }

        if (currentVelocity > 100 && !this.milestone100Logged) {
            console.log(`🎯 Velocity milestone: 100 m/s reached! (${(ratio * 100).toFixed(1)}% of terminal velocity)`);
            this.milestone100Logged = true;
        }

        if (currentVelocity > 150 && !this.milestone150Logged) {
            console.log(`🎯 Velocity milestone: 150 m/s reached! (${(ratio * 100).toFixed(1)}% of terminal velocity)`);
            this.milestone150Logged = true;
        }

        // Reset milestones when velocity drops
        if (currentVelocity < 40) {
            this.milestone50Logged = false;
            this.milestone100Logged = false;
            this.milestone150Logged = false;
        }
    }
    */

    // Get terminal velocity prediction and analysis
    getTerminalVelocityPrediction() {
        const currentAnalysis = this.getTerminalVelocityAnalysis();
        const currentAltitude = this.altitude;

        // Predict terminal velocity at different altitudes
        const predictions = [];
        const altitudes = [currentAltitude, currentAltitude + 500, currentAltitude + 1000, currentAltitude + 2000];

        altitudes.forEach(alt => {
            if (alt <= PHYSICS_CONSTANTS.MAX_ALTITUDE) {
                const temp = this.calculateTemperature(alt);
                const pressure = this.calculatePressureISA(alt);
                const airDensity = this.calculateAirDensity(pressure, temp);

                const predictedTerminal = Math.sqrt((2 * this.mass * PHYSICS_CONSTANTS.GRAVITY) /
                    (airDensity * (this.parachuteOpen ? this.parachuteArea : PHYSICS_CONSTANTS.PARACHUTIST_AREA) *
                        (this.parachuteOpen ? PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_PARACHUTE : PHYSICS_CONSTANTS.DRAG_COEFF_VERTICAL_FREEFALL)));

                predictions.push({
                    altitude: alt,
                    airDensity: airDensity,
                    predictedTerminal: predictedTerminal,
                    changeFromCurrent: predictedTerminal - currentAnalysis.value
                });
            }
        });

        return {
            current: currentAnalysis,
            predictions: predictions,
            airDensityTrend: this.airDensity < 1.0 ? 'decreasing' : this.airDensity > 1.3 ? 'increasing' : 'stable',
            altitudeEffect: currentAltitude > 5000 ? 'significant' : currentAltitude > 2000 ? 'moderate' : 'minimal'
        };
    }
}

// Utility functions for external use
export function createParachutePhysics(world, mass) {
    const physics = new ParachutePhysics(world, mass);

    // Validate environmental calculations on creation (commented out for production)
    // physics.validateEnvironmentalCalculations();

    return physics;
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

// Additional utility functions for Phase 1 completion
export function calculateAirDensityAtAltitude(altitude) {
    const temp = 15 - 0.0065 * altitude; // Standard temperature lapse rate
    const pressure = 101325 * Math.exp(-0.00012 * altitude); // Simplified pressure formula
    return (pressure * 0.02897) / (8.314 * (temp + 273.15));
}

export function calculateTerminalVelocityAtAltitude(mass, area, dragCoeff, altitude) {
    const airDensity = calculateAirDensityAtAltitude(altitude);
    return Math.sqrt((2 * mass * 9.81) / (airDensity * area * dragCoeff));
}
