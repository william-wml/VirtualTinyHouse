import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.maxPolarAngle = Math.PI * 0.98;
  controls.screenSpacePanning = true;
  return controls;
}
