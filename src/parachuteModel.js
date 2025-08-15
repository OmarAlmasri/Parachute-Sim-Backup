import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class ParachuteModel {
    constructor() {
        this.parachute = null;
        this.parachuteGroup = null;
        this.isVisible = false;
        this.openingProgress = 0;
        this.maxRopeLength = 20; // Height above skydiver
        this.parachuteRadius = 8; // For physics calculations
        this.parachuteHeight = 10; // For physics calculations
        this.loader = new GLTFLoader();
        this.isLoaded = false;
    }

    createParachute() {
        // Create parachute group
        this.parachuteGroup = new THREE.Group();

        // Load the GLB model
        this.loader.load(
            '/models/Parachute.glb',
            (gltf) => {
                this.parachute = gltf.scene;

                // Scale the model appropriately
                this.parachute.scale.set(8, 8, 8); // Adjust scale as needed

                // Position the parachute above the skydiver
                this.parachute.position.y = this.maxRopeLength + 24;

                // Add to the group
                this.parachuteGroup.add(this.parachute);

                // Initially hidden
                this.parachuteGroup.visible = false;

                this.isLoaded = true;
                console.log('Parachute GLB model loaded successfully');
            },
            (progress) => {
                console.log('Loading parachute model...', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading parachute model:', error);
                // Fallback to simple geometry if loading fails
                this.createFallbackParachute();
            }
        );

        return this.parachuteGroup;
    }

    createFallbackParachute() {
        // Fallback to simple geometry if GLB loading fails
        const canopyGeometry = new THREE.SphereGeometry(this.parachuteRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const canopyMaterial = new THREE.MeshLambertMaterial({
            color: 0xFF6B35,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        this.parachute = new THREE.Mesh(canopyGeometry, canopyMaterial);
        this.parachute.position.y = this.maxRopeLength;
        this.parachute.scale.set(1, 0.3, 1);

        this.parachuteGroup.add(this.parachute);
        this.parachuteGroup.visible = false;
        this.isLoaded = true;

        console.log('Using fallback parachute geometry');
    }

    // Ropes are now part of the GLB model, so we don't need to create them separately

    show() {
        this.isVisible = true;
        this.parachuteGroup.visible = true;
        this.openingProgress = 0;
    }

    hide() {
        this.isVisible = false;
        this.parachuteGroup.visible = false;
        this.openingProgress = 0;

        // Reset parachute scale and rotation when hiding
        if (this.parachute && this.isLoaded) {
            this.parachute.scale.set(8, 8, 8); // Reset to base scale
            this.parachute.rotation.set(0, 0, 0); // Reset rotation
        }
    }

    updateOpeningProgress(progress) {
        this.openingProgress = Math.min(progress, 1.0);

        if (this.parachuteGroup && this.parachute && this.isLoaded) {
            // Scale parachute during opening
            const baseScale = 8; // Base scale from constructor
            const scale = baseScale * (0.1 + (this.openingProgress * 0.9));
            this.parachute.scale.set(scale, scale, scale);

            // Add some wobble during opening
            if (this.openingProgress < 1.0) {
                const wobble = Math.sin(Date.now() * 0.01) * 0.1 * (1 - this.openingProgress);
                this.parachute.rotation.z = wobble;
            } else {
                this.parachute.rotation.z = 0;
            }
        }
    }

    updatePosition(skydiverPosition) {
        if (this.parachuteGroup && this.isVisible && this.isLoaded) {
            // Position parachute above skydiver
            this.parachuteGroup.position.copy(skydiverPosition);
            this.parachuteGroup.position.y += this.maxRopeLength * this.openingProgress;
        }
    }

    // Add wind effects to parachute
    applyWindEffect(windStrength, windDirection) {
        if (this.parachuteGroup && this.isVisible && this.openingProgress > 0.5 && this.isLoaded) {
            const windInfluence = windStrength * 0.1 * this.openingProgress;

            // Tilt parachute based on wind
            this.parachute.rotation.x = Math.sin(windDirection) * windInfluence;
            this.parachute.rotation.z = Math.cos(windDirection) * windInfluence;

            // Slight position drift due to wind
            this.parachuteGroup.position.x += Math.cos(windDirection) * windInfluence * 0.01;
            this.parachuteGroup.position.z += Math.sin(windDirection) * windInfluence * 0.01;
        }
    }

    // Get parachute state for physics calculations
    getPhysicsState() {
        return {
            isVisible: this.isVisible,
            openingProgress: this.openingProgress,
            area: this.openingProgress * Math.PI * this.parachuteRadius * this.parachuteRadius,
            height: this.maxRopeLength * this.openingProgress
        };
    }

    // Cleanup
    dispose() {
        if (this.parachute) {
            // For GLB models, we need to dispose of all materials and geometries recursively
            this.disposeObject(this.parachute);
        }

        this.parachute = null;
        this.parachuteGroup = null;
        this.isLoaded = false;
    }

    disposeObject(object) {
        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
        if (object.children) {
            object.children.forEach(child => this.disposeObject(child));
        }
    }
}
