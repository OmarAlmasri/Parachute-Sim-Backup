import * as dat from "dat.gui";
import { PHYSICS_CONSTANTS, ParachuteState } from "./parachutePhysics.js";

export class PhysicsControls {
    constructor(parachutePhysics, world, windVisualization = null) {
        this.parachutePhysics = parachutePhysics;
        this.world = world;
        this.windVisualization = windVisualization;
        this.gui = new dat.GUI();

        // Position the GUI on the left side of the screen
        this.gui.domElement.style.position = 'fixed';
        this.gui.domElement.style.top = '0';
        this.gui.domElement.style.left = '0';
        this.gui.domElement.style.right = 'auto';

        this.setupGUI();
    }

    setupGUI() {
        // Physics simulation controls
        const physicsFolder = this.gui.addFolder('Physics Simulation');

        physicsFolder.open();

        // Environmental controls
        const environmentFolder = this.gui.addFolder('Environment');

        // Wind controls
        const windControls = {
            windStrength: this.parachutePhysics.windStrength,
            windDirection: this.parachutePhysics.windDirection * (180 / Math.PI) // Convert to degrees
        };

        // Add wind controls that update automatically
        environmentFolder.add(windControls, 'windStrength', 0, 20, 0.5)
            .name('Wind Strength (m/s)')
            .onChange((value) => {
                this.parachutePhysics.setWind(
                    value,
                    windControls.windDirection * (Math.PI / 180)
                );
                if (this.windVisualization) {
                    this.windVisualization.setWind(
                        value,
                        windControls.windDirection * (Math.PI / 180)
                    );
                }
            });
            
        // Wind Direction controls
        environmentFolder.add(windControls, 'windDirection', 0, 360, 1)
            .name('Wind Direction (°)')
            .onChange((value) => {
                this.parachutePhysics.setWind(
                    windControls.windStrength,
                    value * (Math.PI / 180)
                );
                if (this.windVisualization) {
                    this.windVisualization.setWind(
                        windControls.windStrength,
                        value * (Math.PI / 180)
                    );
                }
            });

        // Temperature and pressure display
        const envDisplay = {
            temperature: this.parachutePhysics.temperature.toFixed(1) + '°C',
            pressure: (this.parachutePhysics.pressure / 1000).toFixed(1) + ' kPa',
            airDensity: this.parachutePhysics.airDensity.toFixed(3) + ' kg/m³',
            altitude: this.parachutePhysics.altitude.toFixed(1) + ' m'
        };

        environmentFolder.add(envDisplay, 'temperature').name('Temperature').listen();
        environmentFolder.add(envDisplay, 'pressure').name('Pressure').listen();
        environmentFolder.add(envDisplay, 'airDensity').name('Air Density').listen();
        environmentFolder.add(envDisplay, 'altitude').name('Altitude').listen();



        // Add parachute deployment status
        const deployStatus = {
            canDeploy: this.parachutePhysics.canDeployParachute() ? '✅ Can Deploy' : '❌ Cannot Deploy',
            reason: this.getDeployReason()
        };
        environmentFolder.add(deployStatus, 'canDeploy').name('Parachute Status').listen();
        environmentFolder.add(deployStatus, 'reason').name('Reason').listen();

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
            
            // Update physics body mass
            if (this.parachutePhysics.onMassChange) {
                this.parachutePhysics.onMassChange(value);
            }
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
            velocityRatio: '0.0%',
            airDensityEffect: 'Standard',
            acceleration: '0.0 m/s²'
        };

        displayFolder.add(physicsDisplay, 'state').name('State').listen();
        displayFolder.add(physicsDisplay, 'altitude').name('Altitude').listen();
        displayFolder.add(physicsDisplay, 'velocity').name('Velocity').listen();
        displayFolder.add(physicsDisplay, 'airDensityEffect').name('Air Density Effect').listen();
        displayFolder.add(physicsDisplay, 'acceleration').name('Acceleration').listen();

        displayFolder.open();

        // Store references for updates
        this.windControls = windControls;
        this.envDisplay = envDisplay;
        this.physicsDisplay = physicsDisplay;
        this.parachuteParams = parachuteParams;
        this.deployStatus = deployStatus;

        // Add altitude-based terminal velocity analysis
        const altitudeAnalysisFolder = this.gui.addFolder('Altitude Analysis');

        const altitudeAnalysis = {
            showAnalysis: () => {
                const analysis = this.parachutePhysics.getAltitudeTerminalVelocityAnalysis();
                console.log('=== Altitude-Based Terminal Velocity Analysis ===');
                analysis.forEach(data => {
                    console.log(`Altitude ${data.altitude}m: ` +
                        `T=${data.temperature.toFixed(1)}°C, ` +
                        `ρ=${data.airDensity.toFixed(3)}kg/m³, ` +
                        `Freefall: ${data.freefallTerminal.toFixed(1)}m/s, ` +
                        `Parachute: ${data.parachuteTerminal.toFixed(1)}m/s`);
                });
                console.log('=== Analysis Complete ===');
            },
            showPrediction: () => {
                const prediction = this.parachutePhysics.getTerminalVelocityPrediction();
                console.log('=== Terminal Velocity Prediction ===');
                console.log(`Current altitude: ${prediction.current.altitude.toFixed(1)}`);
                console.log(`Current terminal velocity: ${prediction.current.value.toFixed(1)}m/s`);
                console.log(`Air density trend: ${prediction.airDensityTrend}`);
                console.log(`Altitude effect: ${prediction.altitudeEffect}`);
                console.log('Predictions:');
                prediction.predictions.forEach(pred => {
                    console.log(`  At ${pred.altitude.toFixed(0)}m: ${pred.predictedTerminal.toFixed(1)}m/s (${pred.changeFromCurrent > 0 ? '+' : ''}${pred.changeFromCurrent.toFixed(1)}m/s)`);
                });
                console.log('=== Prediction Complete ===');
            }
        };

        altitudeAnalysisFolder.add(altitudeAnalysis, 'showAnalysis').name('Show Altitude Analysis');
        altitudeAnalysisFolder.add(altitudeAnalysis, 'showPrediction').name('Show Terminal Velocity Prediction');
        altitudeAnalysisFolder.open();

        // Phase 2 Testing Tools (Commented out for production)
        // const phase2TestFolder = this.gui.addFolder('🧪 Phase 2 Testing');
        // 
        // const phase2Tests = {
        //     testTerminalVelocity: () => this.testPhase2TerminalVelocity(),
        //     testAltitudeEffects: () => this.testPhase2AltitudeEffects(),
        //     testVelocityMilestones: () => this.testPhase2VelocityMilestones(),
        //     validateFormulas: () => this.validatePhase2Formulas()
        // };
        // 
        // phase2TestFolder.add(phase2Tests, 'testTerminalVelocity').name('Test Terminal Velocity');
        // phase2TestFolder.add(phase2Tests, 'testAltitudeEffects').name('Test Altitude Effects');
        // phase2TestFolder.add(phase2Tests, 'testAltitudeEffects').name('Test Altitude Effects');
        // phase2TestFolder.add(phase2Tests, 'validateFormulas').name('Validate Physics Formulas');
        // phase2TestFolder.open();
    }

    updateDisplay() {
        // Ensure GUI stays positioned on the left side
        if (this.gui && this.gui.domElement) {
            this.gui.domElement.style.position = 'fixed';
            this.gui.domElement.style.top = '0';
            this.gui.domElement.style.left = '0';
            this.gui.domElement.style.right = 'auto';
        }

        // Update environmental display
        this.envDisplay.temperature = this.parachutePhysics.temperature.toFixed(1) + '°C';
        this.envDisplay.pressure = (this.parachutePhysics.pressure / 1000).toFixed(1) + ' kPa';
        this.envDisplay.airDensity = this.parachutePhysics.airDensity.toFixed(3) + ' kg/m³';
        this.envDisplay.altitude = this.parachutePhysics.altitude.toFixed(1) + ' m';

        // Update physics display
        this.physicsDisplay.state = this.parachutePhysics.state;
        this.physicsDisplay.altitude = this.parachutePhysics.altitude.toFixed(1) + ' m';
        this.physicsDisplay.velocity = this.parachutePhysics.velocity.length().toFixed(1) + ' m/s';
        this.physicsDisplay.terminalVelocity = this.parachutePhysics.terminalVelocity.toFixed(1) + ' m/s';
        this.physicsDisplay.acceleration = this.parachutePhysics.acceleration.length().toFixed(1) + ' m/s²';

        // Get terminal velocity analysis
        const analysis = this.parachutePhysics.getTerminalVelocityAnalysis();

        // Update enhanced terminal velocity info
        this.physicsDisplay.velocityRatio = (analysis.velocityRatio * 100).toFixed(1) + '%';

        // Determine air density effect description
        if (analysis.airDensity < 1.0) {
            this.physicsDisplay.airDensityEffect = 'Low (High Altitude)';
        } else if (analysis.airDensity > 1.3) {
            this.physicsDisplay.airDensityEffect = 'High (Low Altitude)';
        } else {
            this.physicsDisplay.airDensityEffect = 'Standard (Sea Level)';
        }

        // Update parachute parameters
        this.parachuteParams.mass = this.parachutePhysics.mass;
        this.parachuteParams.parachuteArea = this.parachutePhysics.parachuteArea || PHYSICS_CONSTANTS.PARACHUTE_AREA_ROUND;
        this.parachuteParams.dragCoeffVertical = this.parachutePhysics.dragCoeffVertical;
        this.parachuteParams.dragCoeffHorizontal = this.parachutePhysics.dragCoeffHorizontal;

        // Update deployment status
        this.deployStatus.canDeploy = this.parachutePhysics.canDeployParachute() ? '✅ Can Deploy' : '❌ Cannot Deploy';
        this.deployStatus.reason = this.getDeployReason();
    }

    // Get reason why parachute cannot be deployed
    getDeployReason() {
        if (this.parachutePhysics.canDeployParachute()) {
            return 'Ready to deploy';
        }

        if (this.parachutePhysics.state !== 'freefall') {
            return 'Already deployed or opening';
        }

        if (this.parachutePhysics.altitude <= 5) {
            return 'Too close to ground';
        }

        return 'Unknown reason';
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

    // Phase 2 Testing Methods (Commented out for production)
    /*
    testPhase2TerminalVelocity() {
        console.log('🧪 === PHASE 2: TERMINAL VELOCITY TEST ===');

        const physics = this.parachutePhysics;
        const analysis = physics.getTerminalVelocityAnalysis();

        // Safety check for undefined analysis
        if (!analysis || typeof analysis.value === 'undefined') {
            console.log('❌ ERROR: Terminal velocity analysis returned undefined');
            console.log('Analysis object:', analysis);
            return;
        }

        console.log('Current State Analysis:');
        console.log(`  Altitude: ${(analysis.altitude || 0).toFixed(1)}m`);
        console.log(`  Current Velocity: ${(analysis.currentVelocity || 0).toFixed(1)}m/s`);
        console.log(`  Terminal Velocity: ${analysis.value.toFixed(1)}m/s`);
        console.log(`  Velocity Ratio: ${((analysis.velocityRatio || 0) * 100).toFixed(1)}%`);
        console.log(`  Air Density: ${(analysis.airDensity || 0).toFixed(3)}kg/m³`);
        console.log(`  State: ${analysis.state || 'unknown'}`);
        console.log(`  Approaching Terminal: ${analysis.approachingTerminal ? 'Yes' : 'No'}`);
        console.log(`  At Terminal: ${analysis.atTerminal ? 'Yes' : 'No'}`);
        console.log(`  Exceeding Terminal: ${analysis.exceedingTerminal ? 'Yes' : 'No'}`);

        // Test formula validation
        if (analysis.mass && analysis.airDensity && analysis.area && analysis.dragCoeff) {
            const expectedTerminal = Math.sqrt((2 * analysis.mass * 9.81) /
                (analysis.airDensity * analysis.area * analysis.dragCoeff));
            const formulaAccuracy = Math.abs(analysis.value - expectedTerminal);

            console.log('\nFormula Validation:');
            console.log(`  Expected: ${expectedTerminal.toFixed(1)}m/s`);
            console.log(`  Calculated: ${analysis.value.toFixed(1)}m/s`);
            console.log(`  Accuracy: ${formulaAccuracy < 0.1 ? '✅ PASS' : '❌ FAIL'} (${formulaAccuracy.toFixed(3)}m/s difference)`);
        } else {
            console.log('\n❌ Cannot validate formula - missing required properties');
            console.log('Required properties:', { mass: analysis.mass, airDensity: analysis.airDensity, area: analysis.area, dragCoeff: analysis.dragCoeff });
        }

        console.log('🧪 === PHASE 2 TEST COMPLETE ===');
    }
    */

    /*
    testPhase2AltitudeEffects() {
        console.log('🧪 === PHASE 2: ALTITUDE EFFECTS TEST ===');

        const physics = this.parachutePhysics;
        const altitudeAnalysis = physics.getAltitudeTerminalVelocityAnalysis();

        console.log('Altitude Effects on Terminal Velocity:');
        altitudeAnalysis.forEach((data, index) => {
            if (index % 2 === 0) { // Show every other altitude for readability
                console.log(`\nAltitude ${data.altute}m:`);
                console.log(`  Temperature: ${data.temperature.toFixed(1)}°C`);
                console.log(`  Air Density: ${data.airDensity.toFixed(3)}kg/m³`);
                console.log(`  Freefall Terminal: ${data.freefallTerminal.toFixed(1)}m/s`);
                console.log(`  Parachute Terminal: ${data.parachuteTerminal.toFixed(1)}m/s`);

                // Check if terminal velocity increases with altitude (lower air density)
                if (index > 0) {
                    const prevData = altitudeAnalysis[index - 2];
                    const freefallChange = data.freefallTerminal - prevData.freefallTerminal;
                    const parachuteChange = data.parachuteTerminal - prevData.parachuteTerminal;

                    console.log(`  Freefall Change: ${freefallChange > 0 ? '+' : ''}${freefallChange.toFixed(1)}m/s`);
                    console.log(`  Parachute Change: ${parachuteChange > 0 ? '+' : ''}${parachuteChange.toFixed(1)}m/s`);
                }
            }
        });

        console.log('\n✅ Expected: Terminal velocity should INCREASE with altitude (lower air density)');
        console.log('🧪 === PHASE 2 ALTITUDE TEST COMPLETE ===');
    }
    */

    /*
    testPhase2VelocityMilestones() {
        console.log('🧪 === PHASE 2: VELOCITY MILESTONES TEST ===');

        const physics = this.parachutePhysics;
        const analysis = physics.getTerminalVelocityAnalysis();

        console.log('Current Velocity Status:');
        console.log(`  Current Velocity: ${analysis.currentVelocity.toFixed(1)}m/s`);
        console.log(`  Terminal Velocity: ${analysis.value.toFixed(1)}m/s`);
        console.log(`  Progress to Terminal: ${(analysis.velocityRatio * 100)}%`);
        console.log(`  Progress to Terminal: ${(analysis.velocityRatio * 100).toFixed(1)}%`);

        // Test milestone logic
        const milestones = [
            { speed: 50, name: '50 m/s', reached: analysis.currentVelocity > 50 },
            { speed: 100, name: '100 m/s', reached: analysis.currentVelocity > 100 },
            { speed: 150, name: '150 m/s', reached: analysis.currentVelocity > 150 }
        ];

        console.log('\nMilestone Status:');
        milestones.forEach(milestone => {
            console.log(`  ${milestone.name}: ${milestone.reached ? '✅ REACHED' : '⏳ PENDING'}`);
        });

        // Test terminal velocity proximity
        if (analysis.approachingTerminal) {
            console.log(`\n🚀 APPROACHING TERMINAL VELOCITY: ${(analysis.velocityRatio * 100).toFixed(1)}%`);
        }

        if (analysis.atTerminal) {
            console.log(`⚡ AT TERMINAL VELOCITY: ${(analysis.velocityRatio * 100).toFixed(1)}%`);
        }

        if (analysis.exceedingTerminal) {
            console.log(`⚠️ EXCEEDING TERMINAL VELOCITY: ${(analysis.velocityRatio * 100).toFixed(1)}%`);
        }

        console.log('🧪 === PHASE 2 MILESTONES TEST COMPLETE ===');
    }
    */

    /*
    validatePhase2Formulas() {
        console.log('🧪 === PHASE 2: PHYSICS FORMULA VALIDATION ===');

        const physics = this.parachutePhysics;

        // Test 1: Terminal velocity formula
        console.log('Test 1: Terminal Velocity Formula');
        console.log('Formula: V_terminal = √(2 × m × g) / (ρ × A × C_d)');

        const testCases = [
            { mass: 80, area: 0.7, dragCoeff: 0.7, airDensity: 1.225, description: 'Freefall at sea level' },
            { mass: 80, area: 50, dragCoeff: 1.75, airDensity: 1.225, description: 'Parachute at sea level' },
            { mass: 80, area: 0.7, dragCoeff: 0.7, airDensity: 0.736, description: 'Freefall at 5000m' }
        ];

        testCases.forEach((testCase, index) => {
            const expected = Math.sqrt((2 * testCase.mass * 9.81) /
                (testCase.airCoeff * testCase.area * testCase.dragCoeff));

            console.log(`\n${testCase.description}:`);
            console.log(`  Mass: ${testCase.mass}kg, Area: ${testCase.area}m², C_d: ${testCase.dragCoeff}`);
            console.log(`  Air Density: ${testCase.airDensity}kg/m³`);
            console.log(`  Expected Terminal Velocity: ${expected.toFixed(1)}m/s`);

            // Test the formula manually instead of using physics system (which depends on current state)
            const manualResult = Math.sqrt((2 * testCase.mass * 9.81) /
                (testCase.airDensity * testCase.area * testCase.dragCoeff));
            const accuracy = Math.abs(expected - manualResult);
            console.log(`  Manual Calculation: ${manualResult.toFixed(1)}m/s`);
            console.log(`  Accuracy: ${accuracy < 0.1 ? '✅ PASS' : '❌ FAIL'} (${accuracy.toFixed(3)}m/s difference)`);
        });

        // Test 2: Current physics system state
        console.log('\nTest 2: Current Physics System State');
        const currentAnalysis = physics.getTerminalVelocityAnalysis();
        console.log(`  Current State: ${currentAnalysis.state}`);
        console.log(`  Current Altitude: ${currentAnalysis.altitude.toFixed(1)}m`);
        console.log(`  Current Terminal Velocity: ${currentAnalysis.value.toFixed(1)}m/s`);
        console.log(`  Current Area: ${currentAnalysis.area.toFixed(1)}m²`);
        console.log(`  Current Drag Coefficient: ${currentAnalysis.dragCoeff.toFixed(2)}`);

        console.log('\n✅ Expected: All calculations should match within 0.1 m/s');
        console.log('🧪 === PHASE 2 FORMULA VALIDATION COMPLETE ===');
    }
    */

    destroy() {
        if (this.gui) {
            this.gui.destroy();
        }
    }
}
