import * as THREE from 'three';

// VtH — GLB display-only orientation and ground positioning.
// The source GLB and every mesh geometry remain unchanged.
// The wrapper is returned to viewer.setModel(), which adds it to the scene.
export function positionStudioUpright(
  gltfScene,
  {
    rotationX = -Math.PI / 2,
    groundClearance = 0.02,
    centerHorizontally = true
  } = {}
) {
  const root = new THREE.Group();
  root.name = 'VTH_STUDIO_POSITIONED_ROOT';
  root.userData.vthPositioned = true;
  root.add(gltfScene);

  // Source Studio was constructed with Blender's Y axis vertical.
  // The glTF Y-up conversion places that original axis along glTF Z.
  // Negative 90 degrees on X maps caster-side -Z to viewer-side -Y.
  root.rotation.x = rotationX;
  root.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(root, true);
  if (bounds.isEmpty()) throw new Error('The loaded Studio has no measurable geometry.');

  const center = bounds.getCenter(new THREE.Vector3());
  if (centerHorizontally) {
    root.position.x = -center.x;
    root.position.z = -center.z;
  }
  root.position.y = groundClearance - bounds.min.y;
  root.updateMatrixWorld(true);

  const finalBounds = new THREE.Box3().setFromObject(root, true);
  console.info('VtH: positioning applied', {
    rotationXDegrees: THREE.MathUtils.radToDeg(rotationX),
    modelBottomY: finalBounds.min.y,
    centeredXZ: centerHorizontally
  });

  return root;
}
