import * as THREE from "three";

export class ParachuteModel {
    constructor() {
        this.parachute = null;
        this.ropes = [];
        this.isVisible = false;
        this.openingProgress = 0;
        this.maxRopeLength = 20; // Increased from 8 to 20 for higher positioning
        this.parachuteRadius = 8; // Increased from 4 to 8 for larger canopy
        this.parachuteHeight = 10; // Increased from 1.5 to 2
    }

    createParachute() {
        // Create parachute canopy (dome shape)
        const canopyGeometry = new THREE.SphereGeometry(this.parachuteRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const canopyMaterial = new THREE.MeshLambertMaterial({
            color: 0xFF6B35, // Changed to bright orange for better visibility
            transparent: true,
            opacity: 0.9, // Increased opacity
            side: THREE.DoubleSide
        });

        this.parachute = new THREE.Mesh(canopyGeometry, canopyMaterial);
        this.parachute.position.y = this.maxRopeLength;
        this.parachute.scale.set(1, 0.3, 1); // Flatten the sphere to create dome shape

        // Create parachute group
        this.parachuteGroup = new THREE.Group();
        this.parachuteGroup.add(this.parachute);

        // Create ropes
        this.createRopes();

        // Add ropes to group
        this.ropes.forEach(rope => {
            this.parachuteGroup.add(rope);
        });

        // Initially hidden
        this.parachuteGroup.visible = false;

        return this.parachuteGroup;
    }

    createRopes() {
        const ropeCount = 12; // Increased from 8 to 12 for better coverage
        const ropeGeometry = new THREE.CylinderGeometry(0.04, 0.04, this.maxRopeLength, 8); // Thicker ropes
        const ropeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

        for (let i = 0; i < ropeCount; i++) {
            const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);

            // Position ropes around the parachute edge
            const angle = (i / ropeCount) * Math.PI * 2;
            const radius = this.parachuteRadius * 0.8;

            rope.position.x = Math.cos(angle) * radius;
            rope.position.z = Math.sin(angle) * radius;
            rope.position.y = this.maxRopeLength / 2;

            // Rotate rope to point downward
            rope.rotation.z = Math.atan2(rope.position.x, rope.position.y);
            rope.rotation.x = Math.PI / 2;

            this.ropes.push(rope);
        }
    }

    show() {
        this.isVisible = true;
        this.parachuteGroup.visible = true;
        this.openingProgress = 0;
    }

    hide() {
        this.isVisible = false;
        this.parachuteGroup.visible = false;
        this.openingProgress = 0;
    }

    updateOpeningProgress(progress) {
        this.openingProgress = Math.min(progress, 1.0);

        if (this.parachuteGroup) {
            // Scale parachute during opening
            const scale = 0.1 + (this.openingProgress * 0.9);
            this.parachute.scale.set(scale, 0.3 * scale, scale);

            // Adjust rope lengths during opening
            this.ropes.forEach((rope, index) => {
                const ropeLength = this.maxRopeLength * this.openingProgress;
                rope.scale.y = ropeLength / this.maxRopeLength;
                rope.position.y = ropeLength / 2;
            });

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
        if (this.parachuteGroup && this.isVisible) {
            // Position parachute above skydiver
            this.parachuteGroup.position.copy(skydiverPosition);
            this.parachuteGroup.position.y += this.maxRopeLength * this.openingProgress;
        }
    }

    // Add wind effects to parachute
    applyWindEffect(windStrength, windDirection) {
        if (this.parachuteGroup && this.isVisible && this.openingProgress > 0.5) {
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
            this.parachute.geometry.dispose();
            this.parachute.material.dispose();
        }

        this.ropes.forEach(rope => {
            rope.geometry.dispose();
            rope.material.dispose();
        });

        this.ropes = [];
        this.parachute = null;
        this.parachuteGroup = null;
    }
}
