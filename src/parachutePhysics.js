import * as THREE from "three";
import CANNON, { Vec3 } from "cannon";

// Physics constants from the guide
export const PHYSICS_CONSTANTS = {
    // Environmental
    GRAVITY: 9.81,                    // m/s² / G
    SEA_LEVEL_TEMP: 15,              // °C / T₀
    SEA_LEVEL_PRESSURE: 101325,      // Pa / P₀
    TEMP_LAPSE_RATE: 0.0065,         // °C/m / L
    AIR_MOLAR_MASS: 0.0289644,       // kg/mol / M
    GAS_CONSTANT: 8.3144598,         // J/(mol*K) / R

    // Environmental limits and validation
    MAX_ALTITUDE: 10000,             // Maximum altitude for calculations (10km) / H
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
    // T = T₀ - L × h
    calculateTemperature(altitude) {
        const safeAltitude = Math.max(0, Math.min(altitude, PHYSICS_CONSTANTS.MAX_ALTITUDE));
        const temperature = PHYSICS_CONSTANTS.SEA_LEVEL_TEMP - PHYSICS_CONSTANTS.TEMP_LAPSE_RATE * safeAltitude;

        // Clamp temperature to reasonable bounds
        return Math.max(PHYSICS_CONSTANTS.MIN_TEMPERATURE,
            Math.min(temperature, PHYSICS_CONSTANTS.MAX_TEMPERATURE));
    }

    // P = P₀ × (1 - L × h / T₀)^(g×M)/(R×L)
    calculatePressure(altitude, temperature) {
        const tempKelvin = temperature + 273.15;
        const safeAltitude = Math.max(0, altitude);

        // Use the International Standard Atmosphere (ISA) model for better accuracy
        // This is the standard used by aviation and meteorology
        const exponent = -PHYSICS_CONSTANTS.AIR_MOLAR_MASS * PHYSICS_CONSTANTS.GRAVITY * safeAltitude /
            (PHYSICS_CONSTANTS.GAS_CONSTANT * tempKelvin);

        // Apply ISA correction factors for better accuracy at higher altitudes
        let pressure = PHYSICS_CONSTANTS.SEA_LEVEL_PRESSURE * Math.exp(exponent);

        return pressure;
    }

    // ρ = (P × M) / (R × T)
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
        this.pressure = this.calculatePressure(altitude, this.temperature);
        this.airDensity = this.calculateAirDensity(this.pressure, this.temperature);
    }

    // Force calculations
    // Fg = m × g
    calculateGravity() {
        return new THREE.Vector3(0, -this.mass * PHYSICS_CONSTANTS.GRAVITY, 0);
    }

    // Fd = ½ × Cd × ρ × A × v²
    calculateDrag(velocity, area, dragCoeff) {
        const velocityMagnitude = velocity.length();
        if (velocityMagnitude === 0) return new THREE.Vector3(0, 0, 0);

        const dragMagnitude = 0.5 * dragCoeff * area * this.airDensity * velocityMagnitude * velocityMagnitude;
        const dragDirection = velocity.clone().normalize().multiplyScalar(-1);

        return dragDirection.multiplyScalar(dragMagnitude);
    }

    calculateWind() {
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

    // T = m × g × f(t) - قوة شد الحبل
    calculateTension() {
        if (!this.parachuteOpen) return new THREE.Vector3(0, 0, 0);

        // During opening phase, tension varies gradually
        if (this.state === ParachuteState.OPENING) {
            const openingProgress = (Date.now() - this.parachuteDeployTime) / (this.openingDuration * 1000);
            const tensionFactor = Math.min(openingProgress, 1.0);
            
            // Apply gradual tension during opening
            const baseTension = this.mass * PHYSICS_CONSTANTS.GRAVITY * 0.8; // 80% of weight initially
            const finalTension = this.mass * PHYSICS_CONSTANTS.GRAVITY; // Full weight when fully open
            
            const currentTension = baseTension + (finalTension - baseTension) * tensionFactor;
            return new THREE.Vector3(0, -currentTension, 0);
        }

        return new THREE.Vector3(0, -this.mass * PHYSICS_CONSTANTS.GRAVITY, 0); 
    }

    // Vt = √[(2 × m × g) / (ρ × A × Cd)]
    // عند السرعة النهائية: Fg = Fd
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

        // Fd = 1/2 * Cd * v^2 * A * ρ
        // V = sqrt(2 * m * g / (ρ * A * Cd))
        const terminalVelocity = Math.sqrt((2 * this.mass * PHYSICS_CONSTANTS.GRAVITY) /
            (this.airDensity * area * dragCoeff));

        // Return detailed analysis
        return {
            value: terminalVelocity
        };
    }

    // Add a method to get terminal velocity analysis
    getTerminalVelocityAnalysis() {
        const analysis = this.calculateTerminalVelocity();
        const currentVelocity = this.velocity.length();
        const velocityRatio = currentVelocity / analysis.value;
    
        return {
            ...analysis,
            currentVelocity,
            velocityRatio,
            approachingTerminal: velocityRatio >= 0.8 && velocityRatio <= 1.1,
            atTerminal: velocityRatio >= 0.95 && velocityRatio <= 1.05,
            exceedingTerminal: velocityRatio > 1.1,
            belowTerminal: velocityRatio < 0.8
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

            // Calculate tension force (rope tension)
            const tensionForce = this.calculateTension();

            // Combine forces
            const totalForce = new THREE.Vector3();
            totalForce.add(dragForce);
            totalForce.add(windForce);
            totalForce.add(tensionForce);

            // Apply combined force to physics body
            cannonBody.applyForce(
                new Vec3(totalForce.x, totalForce.y, totalForce.z),
                cannonBody.position
            );
        }

        // Update terminal velocity
        this.terminalVelocity = this.calculateTerminalVelocity().value;

        // Check terminal velocity status
        const analysis = this.getTerminalVelocityAnalysis();

        // Reset flags when velocity drops significantly below terminal
        if (analysis.belowTerminal) {
            this.terminalVelocityLogged = false;
            this.atTerminalVelocityLogged = false;
            this.exceedingTerminalLogged = false;
        }

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
            terminalVelocityAnalysis: this.getTerminalVelocityAnalysis(),
            airDensity: this.airDensity,
            temperature: this.temperature,
            pressure: this.pressure,
            parachuteOpen: this.parachuteOpen,
            tensionInfo: this.getTensionInfo()
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

    // Get tension force information
    getTensionInfo() {
        const tensionForce = this.calculateTension();
        const tensionMagnitude = tensionForce.length();
        
        return {
            tensionForce: tensionForce.clone(),
            tensionMagnitude: tensionMagnitude,
            tensionNewtons: tensionMagnitude,
            tensionPounds: tensionMagnitude * 0.224809, // Convert N to lbs
            tensionKilograms: tensionMagnitude / PHYSICS_CONSTANTS.GRAVITY, // Convert N to kg
            isTensionActive: this.parachuteOpen,
            tensionPercentage: this.parachuteOpen ? (tensionMagnitude / (this.mass * PHYSICS_CONSTANTS.GRAVITY)) * 100 : 0
        };
    }


    //Vt(h) = √[(2 × m × g) / (ρ(h) × A × Cd)]
    getAltitudeTerminalVelocityAnalysis() {
        const altitudes = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
        const analysis = [];

        altitudes.forEach(alt => {
            const temp = this.calculateTemperature(alt);
            const pressure = this.calculatePressure(alt, temp);
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

    /**
     * Vt(h) = √[(2 × m × g) / (ρ(h) × A × Cd)]
     */
    getTerminalVelocityPrediction() {
        const currentAnalysis = this.getTerminalVelocityAnalysis();
        const currentAltitude = this.altitude;

        // Predict terminal velocity at different altitudes
        const predictions = [];
        const altitudes = [currentAltitude, currentAltitude + 500, currentAltitude + 1000, currentAltitude + 2000];

        altitudes.forEach(alt => {
            if (alt <= PHYSICS_CONSTANTS.MAX_ALTITUDE) {
                const temp = this.calculateTemperature(alt);
                const pressure = this.calculatePressure(alt, temp);
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
    
    return physics;
}


//t = √[(2 × h) / g]
export function calculateFreefallTime(initialHeight, finalHeight = 0) {
    // Simple freefall time calculation (ignoring air resistance for simplicity)
    const height = initialHeight - finalHeight;
    return Math.sqrt((2 * height) / PHYSICS_CONSTANTS.GRAVITY);
}

 //v = √(2 × g × h)
export function calculateLandingSpeed(initialHeight, finalHeight = 0) {
    // Simple landing speed calculation (ignoring air resistance for simplicity)
    const height = initialHeight - finalHeight;
    return Math.sqrt(2 * PHYSICS_CONSTANTS.GRAVITY * height);
}
// ρ(h) = (P(h) × M) / (R × T(h))
export function calculateAirDensityAtAltitude(altitude) {
    const temp = 15 - 0.0065 * altitude; // Standard temperature lapse rate
    const pressure = 101325 * Math.exp(-0.00012 * altitude); // Simplified pressure formula
    return (pressure * 0.02897) / (8.314 * (temp + 273.15));
}

// Vt(h) = √[(2 × m × g) / (ρ(h) × A × Cd)]
export function calculateTerminalVelocityAtAltitude(mass, area, dragCoeff, altitude) {
    const airDensity = calculateAirDensityAtAltitude(altitude);
    return Math.sqrt((2 * mass * 9.81) / (airDensity * area * dragCoeff));
}
