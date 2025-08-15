import * as THREE from "three";

export class WindVisualization {
    constructor(scene, windStrength = 5, windDirection = 0) {
        this.scene = scene;
        this.windStrength = windStrength;
        this.windDirection = windDirection;
        this.particles = [];
        this.arrows = [];

        this.createWindParticles();
        this.createWindArrows();
    }

    createWindParticles() {
        const particleCount = 50;
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Random starting position
            particle.position.set(
                (Math.random() - 0.5) * 200,
                Math.random() * 100 + 50,
                (Math.random() - 0.5) * 200
            );

            // Random velocity based on wind
            const speed = this.windStrength * (0.5 + Math.random() * 0.5);
            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(this.windDirection) * speed,
                    0,
                    Math.sin(this.windDirection) * speed
                ),
                life: Math.random() * 10
            };

            this.particles.push(particle);
            this.scene.add(particle);
        }
    }

    createWindArrows() {
        const arrowCount = 8;
        const arrowGeometry = new THREE.ConeGeometry(0.5, 2, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < arrowCount; i++) {
            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

            // Position arrows around the scene
            const angle = (i / arrowCount) * Math.PI * 2;
            const radius = 80;

            arrow.position.set(
                Math.cos(angle) * radius,
                20,
                Math.sin(angle) * radius
            );

            // Point arrow in wind direction
            arrow.rotation.y = this.windDirection;
            arrow.rotation.x = Math.PI / 2;

            // Scale based on wind strength
            const scale = 0.5 + (this.windStrength / 20);
            arrow.scale.set(scale, scale, scale);

            this.arrows.push(arrow);
            this.scene.add(arrow);
        }
    }

    update(deltaTime) {
        // Update particles more gently
        this.particles.forEach(particle => {
            // Move particle with reduced speed
            const moveSpeed = 0.3; // Reduced from 1.0
            particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime * moveSpeed));

            // Reset particle if it goes out of bounds
            if (particle.position.x > 100 || particle.position.x < -100 ||
                particle.position.z > 100 || particle.position.z < -100) {
                particle.position.set(
                    (Math.random() - 0.5) * 200,
                    Math.random() * 100 + 50,
                    (Math.random() - 0.5) * 200
                );
            }

            // Update life and opacity
            particle.userData.life += deltaTime;
            if (particle.userData.life > 10) {
                particle.userData.life = 0;
                particle.material.opacity = 0.6;
            } else {
                particle.material.opacity = 0.6 * (1 - particle.userData.life / 10);
            }
        });

        // Update arrows more gently
        this.arrows.forEach(arrow => {
            // Rotate arrows very slightly to show wind movement (reduced movement)
            arrow.rotation.y = this.windDirection + Math.sin(Date.now() * 0.0005) * 0.05; // Reduced frequency and amplitude

            // Scale arrows based on wind strength
            const scale = 0.5 + (this.windStrength / 20);
            arrow.scale.set(scale, scale, scale);
        });
    }

    setWind(strength, direction) {
        this.windStrength = strength;
        this.windDirection = direction;

        // Update particle velocities
        this.particles.forEach(particle => {
            const speed = this.windStrength * (0.5 + Math.random() * 0.5);
            particle.userData.velocity.set(
                Math.cos(this.windDirection) * speed,
                0,
                Math.sin(this.windDirection) * speed
            );
        });

        // Update arrow rotations
        this.arrows.forEach(arrow => {
            arrow.rotation.y = this.windDirection;
        });
    }

    dispose() {
        // Remove particles from scene
        this.particles.forEach(particle => {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        });

        // Remove arrows from scene
        this.arrows.forEach(arrow => {
            this.scene.remove(arrow);
            arrow.geometry.dispose();
            arrow.material.dispose();
        });

        this.particles = [];
        this.arrows = [];
    }
}
