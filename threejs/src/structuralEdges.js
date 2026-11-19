import * as THREE from 'three';

// VtH architectural edge overlay, inspired by Blender's solid viewport.
// The original GLB meshes, materials, hierarchy, and classifications stay intact.
const EDGE_ANGLE_DEGREES = 30;
const EDGE_COLOR = 0x30434d;
const EDGE_OPACITY = 0.52;
const MAX_TRIANGLES_PER_GEOMETRY = 6000;
const MAX_OVERLAY_MESHES = 500;

const ARCHITECTURAL_CATEGORIES = new Set([
  'VTH_ROOF_FRAMING', 'VTH_ROOF_BLOCKS',
  'VTH_WALL_STUDS', 'VTH_WALL_PLATES', 'VTH_WALL_HEADERS', 'VTH_WALL_BLOCKS',
  'VTH_FLOOR_JOISTS', 'VTH_FLOOR_BLOCKS', 'VTH_FLOOR_HANGERS',
  'VTH_FLOOR_LEDGERS', 'VTH_BUILT_UP_BEAMS', 'VTH_SADDLES'
]);

function triangleCount(geometry) {
  const count = geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
  return Math.floor(count / 3);
}

export class StructuralEdges {
  constructor() {
    this.enabled = true;
    this.lines = [];
    this.geometryCache = new Map();
    this.material = new THREE.LineBasicMaterial({
      color: EDGE_COLOR,
      transparent: true,
      opacity: EDGE_OPACITY,
      depthTest: true,
      depthWrite: false,
      toneMapped: false
    });
    this.lastReport = null;
  }

  attach(root) {
    this.clear();
    const candidates = [];
    root.traverse(object => {
      if (!object.isMesh || object.userData?.vthEdgeOverlay) return;
      const category = object.userData?.vth_category;
      if (!ARCHITECTURAL_CATEGORIES.has(category)) return;
      if (!object.geometry?.getAttribute('position')) return;
      if (triangleCount(object.geometry) > MAX_TRIANGLES_PER_GEOMETRY) return;
      candidates.push(object);
    });

    let skippedByLimit = 0;
    for (const mesh of candidates) {
      if (this.lines.length >= MAX_OVERLAY_MESHES) { skippedByLimit++; continue; }
      const sourceGeometry = mesh.geometry;
      let edgeGeometry = this.geometryCache.get(sourceGeometry);
      if (!edgeGeometry) {
        edgeGeometry = new THREE.EdgesGeometry(sourceGeometry, EDGE_ANGLE_DEGREES);
        this.geometryCache.set(sourceGeometry, edgeGeometry);
      }
      if (!edgeGeometry.getAttribute('position')?.count) continue;

      const lines = new THREE.LineSegments(edgeGeometry, this.material);
      lines.name = 'VtH architectural edges';
      lines.userData.vthEdgeOverlay = true;
      lines.visible = this.enabled;
      lines.frustumCulled = mesh.frustumCulled;
      lines.renderOrder = 1;
      // Lines are visual only: clicking still selects the underlying GLB mesh.
      lines.raycast = () => {};
      mesh.add(lines);
      this.lines.push(lines);
    }
    this.lastReport = {
      outlinedObjects: this.lines.length,
      reusedEdgeGeometries: this.geometryCache.size,
      skippedByLimit,
      edgeAngleDegrees: EDGE_ANGLE_DEGREES
    };
    console.info('VtH architectural edges:', this.lastReport);
    return this.lastReport;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    for (const lines of this.lines) lines.visible = this.enabled;
  }

  clear() {
    for (const lines of this.lines) lines.parent?.remove(lines);
    this.lines = [];
    for (const geometry of this.geometryCache.values()) geometry.dispose();
    this.geometryCache.clear();
  }

  dispose() {
    this.clear();
    this.material.dispose();
  }
}
