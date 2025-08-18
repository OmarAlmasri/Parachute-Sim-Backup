# How to Build a Skybox in Three.js

A skybox is a technique used in 3D graphics to create the illusion of an infinite environment by surrounding the scene with a large cube or sphere mapped with textures that represent the sky, distant mountains, or other environmental elements.

## What You Need

### 1. Skybox Textures
You need **6 textures** for a cube skybox:
- **Right** (+X direction)
- **Left** (-X direction) 
- **Up** (+Y direction)
- **Down** (-Y direction)
- **Front** (+Z direction)
- **Back** (-Z direction)

### 2. Texture Requirements
- **Format**: PNG, JPG, or WebP
- **Size**: Power of 2 (256x256, 512x512, 1024x1024, 2048x2048)
- **Seamless**: Edges should match for seamless transitions
- **Aspect Ratio**: 1:1 (square)

## Implementation Methods

### Method 1: Cube Geometry with 6 Materials (Recommended)
```javascript
function createSkybox(scene, basePath = '/textures/skybox/', format = 'png') {
    // Create a large cube
    const geometry = new THREE.BoxGeometry(1000, 1000, 1000);
    
    // Load textures for each face
    const textureLoader = new THREE.TextureLoader();
    
    const materials = [
        new THREE.MeshBasicMaterial({ 
            map: textureLoader.load(`${basePath}right.${format}`),
            side: THREE.BackSide  // Important: render inside of cube
        }),
        new THREE.MeshBasicMaterial({ 
            map: textureLoader.load(`${basePath}left.${format}`),
            side: THREE.BackSide 
        }),
        new THREE.MeshBasicMaterial({ 
            map: textureLoader.load(`${basePath}up.${format}`),
            side: THREE.BackSide 
        }),
        new THREE.MeshBasicMaterial({ 
            map: textureLoader.load(`${basePath}down.${format}`),
            side: THREE.BackSide 
        }),
        new THREE.MeshBasicMaterial({ 
            map: textureLoader.load(`${basePath}front.${format}`),
            side: THREE.BackSide 
        }),
        new THREE.MeshBasicMaterial({ 
            map: textureLoader.load(`${basePath}back.${format}`),
            side: THREE.BackSide 
        })
    ];
    
    const skybox = new THREE.Mesh(geometry, materials);
    scene.add(skybox);
    return skybox;
}
```

### Method 2: CubeTexture (More Efficient)
```javascript
function createSkyboxFromCubemap(scene, texturePath) {
    const textureLoader = new THREE.CubeTextureLoader();
    const cubeTexture = textureLoader.load([
        `${texturePath}right.png`,
        `${texturePath}left.png`,
        `${texturePath}up.png`,
        `${texturePath}down.png`,
        `${texturePath}front.png`,
        `${texturePath}back.png`
    ]);
    
    // Set as scene background
    scene.background = cubeTexture;
    return cubeTexture;
}
```

### Method 3: Gradient Skybox (No Textures)
```javascript
function createGradientSkybox(scene, topColor = '#87CEEB', bottomColor = '#E0F6FF') {
    const geometry = new THREE.SphereGeometry(500, 32, 32);
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(topColor) },
            bottomColor: { value: new THREE.Color(bottomColor) },
            offset: { value: 33 },
            exponent: { value: 0.6 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `,
        side: THREE.BackSide
    });
    
    const skybox = new THREE.Mesh(geometry, material);
    scene.add(skybox);
    return skybox;
}
```

## Key Concepts

### 1. BackSide Rendering
```javascript
side: THREE.BackSide
```
This renders the **inside** of the cube, which is essential for skyboxes.

### 2. Size Considerations
- **Too small**: Player can see the edges
- **Too large**: Performance impact and potential floating-point precision issues
- **Recommended**: 1000-2000 units (depending on your scene scale)

### 3. Texture Loading Order
The order matters for BoxGeometry:
1. Right (+X)
2. Left (-X) 
3. Up (+Y)
4. Down (-Y)
5. Front (+Z)
6. Back (-Z)

## Advanced Features

### 1. Day/Night Cycle
```javascript
function updateSkyboxRotation(skybox, rotationSpeed = 0.0001, deltaTime = 0.016) {
    if (skybox) {
        skybox.rotation.y += rotationSpeed * deltaTime;
    }
}

// In your animation loop:
updateSkyboxRotation(skybox, 0.0001, deltaTime);
```

### 2. Dynamic Skybox Changes
```javascript
function changeSkybox(skybox, newTextures) {
    // Update materials with new textures
    skybox.material.forEach((material, index) => {
        material.map = newTextures[index];
        material.needsUpdate = true;
    });
}
```

### 3. Fog Integration
```javascript
// Match fog color with skybox
scene.fog = new THREE.Fog('#87ceeb', 100, 400);
```

## Performance Tips

1. **Use appropriate texture sizes** - Don't use 4K textures unless necessary
2. **Consider using CubeTexture** for better performance
3. **Disable shadows** on skybox materials
4. **Use texture compression** (WebP, DDS) when possible

## Common Issues & Solutions

### 1. Seams Between Faces
- Ensure textures are seamless
- Use proper UV mapping
- Check texture resolution consistency

### 2. Performance Issues
- Reduce texture resolution
- Use CubeTexture instead of 6 separate materials
- Consider gradient skybox for simple scenes

### 3. Visible Edges
- Increase skybox size
- Move camera away from edges
- Use spherical skybox for better coverage

## Your Current Setup

You already have:
✅ Complete set of 6 skybox textures
✅ Proper file structure (`/textures/skybox/`)
✅ Integration with your main scene
✅ Fog that complements the skybox

The skybox is now automatically created when your scene loads and will provide a beautiful, immersive environment for your parachute simulation!
