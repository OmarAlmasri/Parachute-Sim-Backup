import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export function setupFirstPersonCamera(camera, canvas) {
    const controls = new PointerLockControls(camera, canvas);

    // Movement variables
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let canJump = false;

    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();

    // Movement speed
    const speed = 0.1;

    // Click to start
    canvas.addEventListener('click', function () {
        controls.lock();
    });

    // Key controls
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
            case 'Space':
                if (canJump) velocity.y += 350;
                canJump = false;
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
        }
    });

    // Animation function
    function animate() {
        requestAnimationFrame(animate);

        if (controls.isLocked) {
            // Calculate movement direction
            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.normalize();

            // Apply movement
            if (moveForward || moveBackward) velocity.z -= direction.z * speed;
            if (moveLeft || moveRight) velocity.x -= direction.x * speed;

            // Apply velocity to camera
            controls.moveRight(-velocity.x);
            controls.moveForward(-velocity.z);

            // Damping
            velocity.x *= 0.9;
            velocity.z *= 0.9;
        }
    }

    animate();

    return controls;
} 