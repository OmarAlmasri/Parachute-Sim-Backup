import { FlyControls } from "three/examples/jsm/controls/FlyControls.js";

export function setupFlyCamera(camera, canvas) {
    const controls = new FlyControls(camera);

    // Configure FlyControls
    controls.movementSpeed = 50.0;       // Movement speed
    controls.rollSpeed = 0.005;          // Roll speed (Q/E keys)
    controls.dragToLook = false;         // Disable drag to look (use mouse for rotation)
    controls.autoForward = false;        // Disable auto-forward

    // Mouse sensitivity settings
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
    };

    // Increase mouse sensitivity
    controls.pitchObject.rotation.x = 0;
    controls.yawObject.rotation.y = 0;

    // Set the DOM element for mouse events
    controls.domElement = canvas;

    return controls;
} 