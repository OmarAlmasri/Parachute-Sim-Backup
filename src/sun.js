import * as THREE from "three";

/**
 * Creates and configures the sun lighting system
 * @param {THREE.Texture} sunGlowTexture - Texture for the sun glow effect
 * @returns {Object} Object containing sun light and glow
 */
export function createSun(sunGlowTexture) {
  // SUN light
  const sunLight = new THREE.DirectionalLight("#b9d5ff", 1);
  sunLight.position.set(200, 200, -200);

  // Sun glow effect
  const sunGlowMaterial = new THREE.SpriteMaterial({
    map: sunGlowTexture,
    color: 0xffffaa,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const sunGlow = new THREE.Sprite(sunGlowMaterial);
  sunGlow.scale.set(30, 30, 1); 
  sunGlow.position.copy(sunLight.position);

  return {
    sunLight,
    sunGlow
  };
} 