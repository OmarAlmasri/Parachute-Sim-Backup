import * as THREE from "three";

export function createSkybox(scene) {
    
    const cubeLoader = new THREE.CubeTextureLoader();
    const cubeTexture = cubeLoader.load([
        '/textures/skybox/px.png',
        '/textures/skybox/nx.png',
        '/textures/skybox/py.png',
        '/textures/skybox/ny.png',
        '/textures/skybox/pz.png',
        '/textures/skybox/nz.png',
    ]);
    scene.background = cubeTexture;
    scene.environment = cubeTexture;

    return scene;
}