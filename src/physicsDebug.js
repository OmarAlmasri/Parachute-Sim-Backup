import * as THREE from "three";

export class PhysicsDebugDisplay {
    constructor(containerId = 'physics-debug') {
        this.container = document.getElementById(containerId) || this.createContainer();
        this.isVisible = true;
        this.updateInterval = null;
        this.startTime = Date.now();

        this.createDisplay();
        this.startUpdates();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'physics-debug';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-width: 300px;
            z-index: 1000;
            border: 1px solid #333;
        `;
        document.body.appendChild(container);
        return container;
    }

    createDisplay() {
        this.container.innerHTML = `
            <div style="margin-bottom: 10px; border-bottom: 1px solid #555; padding-bottom: 5px;">
                <strong>🧪 Custom Physics Debug</strong>
                <button id="toggle-physics-debug" style="float: right; background: #444; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Hide</button>
            </div>
            <div id="physics-stats">
                <div>⏱️ Time: <span id="physics-time">0.00</span>s</div>
                <div>🌍 Gravity: <span id="physics-gravity">9.81</span> m/s²</div>
                <div>📊 Bodies: <span id="physics-bodies">0</span></div>
                <div>⚡ Active: <span id="physics-active">0</span></div>
            </div>
            <div style="margin-top: 10px; border-top: 1px solid #555; padding-top: 5px;">
                <div>🎯 Position: <span id="physics-position">(0, 0, 0)</span></div>
                <div>🚀 Velocity: <span id="physics-velocity">(0, 0, 0)</span></div>
                <div>⚡ Acceleration: <span id="physics-acceleration">(0, 0, 0)</span></div>
                <div>⚖️ Mass: <span id="physics-mass">80</span> kg</div>
            </div>
            <div style="margin-top: 10px; border-top: 1px solid #555; padding-top: 5px;">
                <div>🔋 Kinetic Energy: <span id="physics-kinetic">0.00</span> J</div>
                <div>📈 Potential Energy: <span id="physics-potential">0.00</span> J</div>
                <div>💥 Total Energy: <span id="physics-total">0.00</span> J</div>
                <div>🌬️ Air Resistance: <span id="physics-air-resistance">0.02</span></div>
            </div>
            <div style="margin-top: 10px; border-top: 1px solid #555; padding-top: 5px;">
                <div>🏠 On Ground: <span id="physics-ground">No</span></div>
                <div>🔄 State: <span id="physics-state">Active</span></div>
                <div>💤 Sleep State: <span id="physics-sleep">Awake</span></div>
            </div>
        `;

        // Add toggle functionality
        const toggleBtn = document.getElementById('toggle-physics-debug');
        toggleBtn.addEventListener('click', () => this.toggle());
    }

    startUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, 100); // Update every 100ms
    }

    updateDisplay() {
        if (!this.isVisible) return;

        const currentTime = (Date.now() - this.startTime) / 1000;

        // Update time
        const timeElement = document.getElementById('physics-time');
        if (timeElement) timeElement.textContent = currentTime.toFixed(2);

        // Update physics world stats if available
        if (window.physicsControls && window.physicsControls.world) {
            const stats = window.physicsControls.world.getStats();
            const bodiesElement = document.getElementById('physics-bodies');
            const activeElement = document.getElementById('physics-active');

            if (bodiesElement) bodiesElement.textContent = stats.bodyCount;
            if (activeElement) activeElement.textContent = stats.activeBodies;
        }

        // Update physics body stats if available
        if (window.person && window.person.getPhysicsBody) {
            const physicsBody = window.person.getPhysicsBody();
            if (physicsBody) {
                this.updateBodyStats(physicsBody);
            }
        }
    }

    updateBodyStats(physicsBody) {
        // Position
        const positionElement = document.getElementById('physics-position');
        if (positionElement) {
            positionElement.textContent = `(${physicsBody.position.x.toFixed(1)}, ${physicsBody.position.y.toFixed(1)}, ${physicsBody.position.z.toFixed(1)})`;
        }

        // Velocity
        const velocityElement = document.getElementById('physics-velocity');
        if (velocityElement) {
            const speed = physicsBody.velocity.length();
            positionElement.style.color = speed > 50 ? '#ff6b6b' : speed > 20 ? '#ffd93d' : '#6bcf7f';
            velocityElement.textContent = `(${physicsBody.velocity.x.toFixed(1)}, ${physicsBody.velocity.y.toFixed(1)}, ${physicsBody.velocity.z.toFixed(1)})`;
        }

        // Acceleration
        const accelerationElement = document.getElementById('physics-acceleration');
        if (accelerationElement) {
            accelerationElement.textContent = `(${physicsBody.acceleration.x.toFixed(1)}, ${physicsBody.acceleration.y.toFixed(1)}, ${physicsBody.acceleration.z.toFixed(1)})`;
        }

        // Mass
        const massElement = document.getElementById('physics-mass');
        if (massElement) {
            massElement.textContent = physicsBody.mass;
        }

        // Energy calculations
        if (physicsBody.getKineticEnergy) {
            const kineticElement = document.getElementById('physics-kinetic');
            const potentialElement = document.getElementById('physics-potential');
            const totalElement = document.getElementById('physics-total');

            if (kineticElement) kineticElement.textContent = physicsBody.getKineticEnergy().toFixed(1);
            if (potentialElement) potentialElement.textContent = physicsBody.getPotentialEnergy().toFixed(1);
            if (totalElement) totalElement.textContent = physicsBody.getTotalEnergy().toFixed(1);
        }

        // Ground contact
        const groundElement = document.getElementById('physics-ground');
        if (groundElement) {
            groundElement.textContent = physicsBody.onGround ? 'Yes' : 'No';
            groundElement.style.color = physicsBody.onGround ? '#6bcf7f' : '#ff6b6b';
        }

        // State
        const stateElement = document.getElementById('physics-state');
        if (stateElement) {
            stateElement.textContent = physicsBody.isActive ? 'Active' : 'Inactive';
            stateElement.style.color = physicsBody.isActive ? '#6bcf7f' : '#ff6b6b';
        }

        // Sleep state
        const sleepElement = document.getElementById('physics-sleep');
        if (sleepElement) {
            sleepElement.textContent = physicsBody.sleepState === 0 ? 'Awake' : 'Sleeping';
            sleepElement.style.color = physicsBody.sleepState === 0 ? '#6bcf7f' : '#ff6b6b';
        }
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';

        const toggleBtn = document.getElementById('toggle-physics-debug');
        if (toggleBtn) {
            toggleBtn.textContent = this.isVisible ? 'Hide' : 'Show';
        }
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Create and export a global instance
export const physicsDebug = new PhysicsDebugDisplay();
window.physicsDebug = physicsDebug;
