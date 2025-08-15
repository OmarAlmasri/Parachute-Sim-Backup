import * as dat from "dat.gui";
import { PHYSICS_CONSTANTS, ParachuteState } from "./parachutePhysics.js";

export class PhysicsControls {
    constructor(parachutePhysics, world, windVisualization = null) {
        this.parachutePhysics = parachutePhysics;
        this.world = world;
        this.windVisualization = windVisualization;
        this.gui = new dat.GUI();

        this.setupGUI();
    }

    setupGUI() {
        // Physics simulation controls
        const physicsFolder = this.gui.addFolder('Physics Simulation');

        // Parachute deployment
        const deployButton = { deploy: () => this.parachutePhysics.deployParachute() };
        physicsFolder.add(deployButton, 'deploy').name('Deploy Parachute');

        // Reset simulation
        const resetButton = { reset: () => this.resetSimulation() };
        physicsFolder.add(resetButton, 'reset').name('Reset Simulation');

        physicsFolder.open();

        // Environmental controls
        const environmentFolder = this.gui.addFolder('Environment');

        // Wind controls
        const windControls = {
            windStrength: this.parachutePhysics.windStrength,
            windDirection: this.parachutePhysics.windDirection * (180 / Math.PI), // Convert to degrees
            setWind: () => {
                this.parachutePhysics.setWind(
                    windControls.windStrength,
                    windControls.windDirection * (Math.PI / 180) // Convert back to radians
                );
            }
        };

        environmentFolder.add(windControls, 'windStrength', 0, 20, 0.5).name('Wind Strength (m/s)');
        environmentFolder.add(windControls, 'windDirection', 0, 360, 1).name('Wind Direction (°)');
        environmentFolder.add(windControls, 'setWind').name('Apply Wind');

        // Add wind disable button
        const disableWindButton = { disable: () => this.parachutePhysics.disableWind() };
        environmentFolder.add(disableWindButton, 'disable').name('Disable Wind');

        // Update wind visualization if available
        if (this.windVisualization) {
            windControls.setWind = () => {
                this.parachutePhysics.setWind(
                    windControls.windStrength,
                    windControls.windDirection * (Math.PI / 180)
                );
                this.windVisualization.setWind(
                    windControls.windStrength,
                    windControls.windDirection * (Math.PI / 180)
                );
            };

            // Also update visualization when wind is disabled
            const originalDisableWind = this.parachutePhysics.disableWind;
            this.parachutePhysics.disableWind = () => {
                originalDisableWind.call(this.parachutePhysics);
                this.windVisualization.setWind(0, 0);
            };
        }

        // Temperature and pressure display
        const envDisplay = {
            temperature: this.parachutePhysics.temperature.toFixed(1) + '°C',
            pressure: (this.parachutePhysics.pressure / 1000).toFixed(1) + ' kPa',
            airDensity: this.parachutePhysics.airDensity.toFixed(3) + ' kg/m³'
        };

        environmentFolder.add(envDisplay, 'temperature').name('Temperature').listen();
        environmentFolder.add(envDisplay, 'pressure').name('Pressure').listen();
        environmentFolder.add(envDisplay, 'airDensity').name('Air Density').listen();

        environmentFolder.open();

        // Parachute parameters
        const parachuteFolder = this.gui.addFolder('Parachute');

        const parachuteParams = {
            mass: this.parachutePhysics.mass,
            parachuteArea: this.parachutePhysics.parachuteArea || PHYSICS_CONSTANTS.PARACHUTE_AREA_ROUND,
            dragCoeffVertical: this.parachutePhysics.dragCoeffVertical,
            dragCoeffHorizontal: this.parachutePhysics.dragCoeffHorizontal
        };

        parachuteFolder.add(parachuteParams, 'mass', 50, 120, 1).name('Mass (kg)').onChange((value) => {
            this.parachutePhysics.mass = value;
        });

        parachuteFolder.add(parachuteParams, 'parachuteArea', 20, 100, 1).name('Parachute Area (m²)').onChange((value) => {
            this.parachutePhysics.parachuteArea = value;
        });

        parachuteFolder.add(parachuteParams, 'dragCoeffVertical', 0.5, 3.0, 0.05).name('Vertical Drag Coeff').onChange((value) => {
            this.parachutePhysics.dragCoeffVertical = value;
        });

        parachuteFolder.add(parachuteParams, 'dragCoeffHorizontal', 0.5, 3.0, 0.05).name('Horizontal Drag Coeff').onChange((value) => {
            this.parachutePhysics.dragCoeffHorizontal = value;
        });

        parachuteFolder.open();

        // Real-time physics display
        const displayFolder = this.gui.addFolder('Real-time Physics');

        const physicsDisplay = {
            state: this.parachutePhysics.state,
            altitude: this.parachutePhysics.altitude.toFixed(1) + ' m',
            velocity: '0.0 m/s',
            terminalVelocity: this.parachutePhysics.terminalVelocity.toFixed(1) + ' m/s',
            acceleration: '0.0 m/s²'
        };

        displayFolder.add(physicsDisplay, 'state').name('State').listen();
        displayFolder.add(physicsDisplay, 'altitude').name('Altitude').listen();
        displayFolder.add(physicsDisplay, 'velocity').name('Velocity').listen();
        displayFolder.add(physicsDisplay, 'terminalVelocity').name('Terminal Velocity').listen();
        displayFolder.add(physicsDisplay, 'acceleration').name('Acceleration').listen();

        displayFolder.open();

        // Store references for updates
        this.windControls = windControls;
        this.envDisplay = envDisplay;
        this.physicsDisplay = physicsDisplay;
        this.parachuteParams = parachuteParams;
    }

    updateDisplay() {
        // Update environmental display
        this.envDisplay.temperature = this.parachutePhysics.temperature.toFixed(1) + '°C';
        this.envDisplay.pressure = (this.parachutePhysics.pressure / 1000).toFixed(1) + ' kPa';
        this.envDisplay.airDensity = this.parachutePhysics.airDensity.toFixed(3) + ' kg/m³';

        // Update physics display
        this.physicsDisplay.state = this.parachutePhysics.state;
        this.physicsDisplay.altitude = this.parachutePhysics.altitude.toFixed(1) + ' m';
        this.physicsDisplay.velocity = this.parachutePhysics.velocity.length().toFixed(1) + ' m/s';
        this.physicsDisplay.terminalVelocity = this.parachutePhysics.terminalVelocity.toFixed(1) + ' m/s';
        this.physicsDisplay.acceleration = this.parachutePhysics.acceleration.length().toFixed(1) + ' m/s²';

        // Update parachute parameters
        this.parachuteParams.mass = this.parachutePhysics.mass;
        this.parachuteParams.parachuteArea = this.parachutePhysics.parachuteArea || PHYSICS_CONSTANTS.PARACHUTE_AREA_ROUND;
        this.parachuteParams.dragCoeffVertical = this.parachutePhysics.dragCoeffVertical;
        this.parachuteParams.dragCoeffHorizontal = this.parachutePhysics.dragCoeffHorizontal;
    }

    resetSimulation() {
        // Reset physics
        this.parachutePhysics.reset();

        // Reset world gravity (in case it was modified)
        this.world.gravity.set(0, -PHYSICS_CONSTANTS.GRAVITY, 0);

        // Reset all bodies to initial positions
        this.world.bodies.forEach(body => {
            if (body.userData && body.userData.initialPosition) {
                // Reset position
                body.position.copy(body.userData.initialPosition);

                // Reset velocity and angular velocity
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);

                // Wake up the body and ensure it's active
                body.wakeUp();
                body.sleepSpeedLimit = 0.1;
                body.sleepTimeLimit = 0.1;

                console.log('Reset body to:', body.userData.initialPosition);
            }
        });

        console.log('Simulation reset');
    }

    destroy() {
        if (this.gui) {
            this.gui.destroy();
        }
    }
}
