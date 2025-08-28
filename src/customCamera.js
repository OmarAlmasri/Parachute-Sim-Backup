import * as THREE from "three";

export function setupCustomCamera(camera, canvas) {
    // Mouse movement variables
    let mouseX = 0;
    let mouseY = 0;
    let isMouseDown = false;

    // Movement variables
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let moveUp = false;
    let moveDown = false;

    // Camera rotation
    let pitch = 0;
    let yaw = -Math.PI/2; // Initialize to 90 degrees to face PLATFORM

    // Movement speed
    const moveSpeed = 3;
    const mouseSensitivity = 0.005;

    // Apply initial camera rotation + position
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.position.set(-150, 100, 40);

    // Mouse event listeners
    canvas.addEventListener('mousedown', (event) => {
        isMouseDown = true;
        canvas.requestPointerLock();
    });

    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (isMouseDown) {
            mouseX = event.movementX || 0;
            mouseY = event.movementY || 0;

            // Update camera rotation
            yaw -= mouseX * mouseSensitivity;
            pitch -= mouseY * mouseSensitivity;

            // Clamp pitch to prevent over-rotation
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        }
    });

    // Keyboard event listeners
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                moveRight = true;
                break;
            // case 'KeyR':
            case 'Space':
                moveUp = true;
                break;
            case 'KeyF':
            case 'ShiftLeft':
                moveDown = true;
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                moveRight = false;
                break;
            case 'KeyR':
            case 'Space':
                moveUp = false;
                break;
            case 'KeyF':
            case 'ShiftLeft':
                moveDown = false;
                break;
        }
    });

    // Update function to be called in animation loop
    function update() {
        // Calculate movement direction
        const direction = new THREE.Vector3();

        if (moveForward) direction.z -= 1;
        if (moveBackward) direction.z += 1;
        if (moveLeft) direction.x -= 1;
        if (moveRight) direction.x += 1;
        if (moveUp) direction.y += 1;
        if (moveDown) direction.y -= 1;

        // Normalize and apply movement
        if (direction.length() > 0) {
            direction.normalize();
            direction.multiplyScalar(moveSpeed);

            // Apply rotation to movement direction
            const rotatedDirection = direction.clone();
            rotatedDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

            camera.position.add(rotatedDirection);
        }

        // Apply camera rotation
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }

    return { update };
} 