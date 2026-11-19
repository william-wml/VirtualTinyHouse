import * as THREE from 'three';
export function addLighting(scene) {
  // Viewport-only slate blue-gray background, contrasting white and unmaterialed meshes.
  // Keep the scene background opaque; Three.js renders this behind the GLB.
  scene.background = new THREE.Color('#879dac');
  scene.add(new THREE.HemisphereLight(0xf4f7ff, 0xb8b5ac, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(9, 16, 11);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd9eafa, 1.2);
  fill.position.set(-10, 7, -7);
  scene.add(fill);
}
