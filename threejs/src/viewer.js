import * as THREE from 'three';
import { createControls } from './controls.js';
import { addLighting } from './lighting.js';
import { StructuralEdges } from './structuralEdges.js';

// Contrasting highlights: champagne hover and warm amber selection.
// Colors deliberately differ from the slate-blue viewport and charcoal edges.
const HOVER_COLOR = 0xfff2cf;
const SELECT_COLOR = 0xffb833;
const HOVER_INTERVAL_MS = 65;


export class VtHViewer {
  constructor(canvas, onSelect = () => {}) {
    this.canvas = canvas;
    this.onSelect = onSelect;
    this.scene = new THREE.Scene();
    addLighting(this.scene);
    this.camera = new THREE.PerspectiveCamera(42, 1, .01, 10000);
    this.camera.position.set(13, 10, 17);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    // Opt-in performance sampling (not visible to public visitors).
    // Activate with ?vthPerf=1 or ?vthPerf=on in the page URL.
    // No network reporting or telemetry: results are local console logs.
    const perfOption = new URLSearchParams(window.location.search).get('vthPerf');
    this.performanceReviewEnabled = perfOption === '1' || perfOption === 'on';
    this.performanceReview = null;
    if (this.performanceReviewEnabled) {
      this.performanceReview = {
        lastSample: performance.now(),
        frames: 0,
        intervalMs: 5000,
        lastDrawCalls: 0,
        lastTriangles: 0,
        lastLines: 0,
      };
      console.info('[VtH performance] Local sampling enabled. Disable by removing ?vthPerf=1.');
    }

    // Restrict mobile pixel density to lower GPU fill-rate cost.
    // Desktop retains its original maximum of 2.
    this.appliedPixelRatio = null;
    this.updatePixelRatio();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.controls = createControls(this.camera, canvas);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.controls.enableDamping = !this.reducedMotion.matches;
    this.onMotionPreferenceChange = () => {
      this.controls.enableDamping = !this.reducedMotion.matches;
      if (this.reducedMotion.matches && this.cameraTransition) {
        this.camera.position.copy(this.cameraTransition.endPosition);
        this.controls.target.copy(this.cameraTransition.endTarget);
        this.cameraTransition = null;
        this.controls.update();
      }
    };
    this.reducedMotion.addEventListener?.('change', this.onMotionPreferenceChange);
    // Keyboard controls apply only when the visitor focuses the 3D canvas.
    canvas.addEventListener('keydown', event => this.handleKeyboard(event));
    this.controls.addEventListener('start', () => {
      this.cameraTransition = null;
      this.dragging = true;
      this.clearHover();
    });
    this.controls.addEventListener('end', () => { this.dragging = false; });
    this.group = null;
    this.structuralEdges = new StructuralEdges();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.selection = null;
    this.selectionBox = null;
    this.hovered = null;
    this.hoverBox = null;
    this.hoverLastCheck = 0;
    this.dragging = false;
    this.cameraTransition = null;
    this.grid = new THREE.GridHelper(36, 36, 0xd0d9e3, 0xe9edf1);
    this.scene.add(this.grid);
    let start = null;
    canvas.addEventListener('pointerdown', event => { if (event.button === 0) start = [event.clientX, event.clientY]; });
    canvas.addEventListener('pointerup', event => {
      if (event.button !== 0 || !start) return;
      const distance = Math.hypot(event.clientX - start[0], event.clientY - start[1]);
      start = null;
      if (distance < 5) this.pick(event);
    });
    canvas.addEventListener('pointercancel', () => { start = null; this.clearHover(); });
    canvas.addEventListener('pointerleave', () => { start = null; this.clearHover(); });
    canvas.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || event.buttons || this.dragging) {
        if (event.buttons) this.clearHover();
        return;
      }
      const now = performance.now();
      if (now - this.hoverLastCheck < HOVER_INTERVAL_MS) return;
      this.hoverLastCheck = now;
      const hit = this.findHit(event);
      this.setHover(hit && hit !== this.selection ? hit : null);
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);
    // Avoid rendering a heavy model in a background browser tab.
    this.onVisibilityChange = () => {
      this.renderer.setAnimationLoop(document.hidden ? null : this.animate);
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }
  updatePixelRatio() {
    const isNarrow = window.matchMedia('(max-width: 790px)').matches;
    const ratio = Math.min(window.devicePixelRatio || 1, isNarrow ? 1.5 : 2);
    if (ratio !== this.appliedPixelRatio) {
      this.appliedPixelRatio = ratio;
      this.renderer.setPixelRatio(ratio);
    }
  }
  setGrid(visible) { this.grid.visible = visible; }
  setEdgesVisible(visible) { this.structuralEdges.setEnabled(visible); }
  setModel(group) {
    this.clearHover();
    this.clearSelection();
    if (this.group) {
      this.structuralEdges.clear();
      this.scene.remove(this.group);
    }
    this.group = group;
    this.scene.add(group);
    this.frame(group);
    this.structuralEdges.attach(group);
  }
  // Keyboard navigation: arrow keys orbit, +/- zoom, Home resets,
  // and Escape clears selection. Never capture keys outside the canvas.
  handleKeyboard(event) {
    if (!this.group || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key;
    if (key === 'Escape') {
      event.preventDefault();
      this.clearSelection();
      return;
    }
    if (key === 'Home') {
      event.preventDefault();
      this.reset();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(key)) return;
    event.preventDefault();
    this.cameraTransition = null;
    const target = this.controls.target.clone();
    const relative = this.camera.position.clone().sub(target);
    const spherical = new THREE.Spherical().setFromVector3(relative);
    if (key === 'ArrowLeft') spherical.theta -= THREE.MathUtils.degToRad(12);
    if (key === 'ArrowRight') spherical.theta += THREE.MathUtils.degToRad(12);
    if (key === 'ArrowUp') spherical.phi -= THREE.MathUtils.degToRad(10);
    if (key === 'ArrowDown') spherical.phi += THREE.MathUtils.degToRad(10);
    if (key === '+' || key === '=') spherical.radius *= 0.84;
    if (key === '-' || key === '_') spherical.radius *= 1.19;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.05, Math.min(this.controls.maxPolarAngle, Math.PI - 0.05));
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(target.add(new THREE.Vector3().setFromSpherical(spherical)));
    this.controls.update();
  }
  // Camera framing uses the projected bounds of the actual visible model.
  // This accounts for portrait/mobile viewports as well as widescreen displays.
  getFitPose(object, margin = 1.18) {
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) throw new Error('Model has no geometry to frame.');
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const diagonal = Math.max(size.length(), 0.1);
    const eye = new THREE.Vector3(0.82, 0.61, 1).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), eye).normalize();
    const up = new THREE.Vector3().crossVectors(eye, right).normalize();
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const vTan = Math.tan(vfov / 2);
    const hTan = vTan * Math.max(this.camera.aspect, 0.1);
    let required = 0;
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const offset = new THREE.Vector3(x, y, z).sub(center);
          const depth = offset.dot(eye);
          required = Math.max(required,
            Math.abs(offset.dot(right)) / hTan + depth,
            Math.abs(offset.dot(up)) / vTan + depth);
        }
      }
    }
    const distance = Math.max(required * margin, diagonal * 0.35, 0.5);
    return { center, position: center.clone().addScaledVector(eye, distance), diagonal };
  }
  frame(object) {
    this.cameraTransition = null;
    const pose = this.getFitPose(object);
    const radius = pose.diagonal;
    this.controls.target.copy(pose.center);
    this.camera.position.copy(pose.position);
    this.camera.near = Math.max(radius / 3000, 0.001);
    this.camera.far = Math.max(radius * 150, 100);
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = Math.max(radius * 0.015, 0.01);
    this.controls.maxDistance = Math.max(radius * 20, 20);
    this.controls.update();
    this.savedPosition = pose.position.clone();
    this.savedTarget = pose.center.clone();
    const box = new THREE.Box3().setFromObject(object);
    this.grid.position.y = object.userData?.vthPositioned ? 0 : box.min.y - 0.05;
    this.grid.scale.setScalar(Math.max(radius / 30, 0.25));
  }
  // Smooth, short camera moves. A user drag/wheel cancels the automatic motion.
  transitionTo(position, target, duration = 650) {
    if (this.reducedMotion.matches) {
      this.cameraTransition = null;
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    this.cameraTransition = {
      startPosition: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endPosition: position.clone(),
      endTarget: target.clone(),
      startTime: performance.now(),
      duration
    };
  }
  reset() {
    if (!this.savedPosition) return;
    this.transitionTo(this.savedPosition, this.savedTarget);
  }
  isVisibleInHierarchy(object) {
    let current = object;
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }
  // Remove temporary visual helpers; the model materials are never modified.
  disposeHelper(helper) {
    if (!helper) return;
    this.scene.remove(helper);
    helper.geometry.dispose();
    helper.material.dispose();
  }
  clearHover() {
    this.hovered = null;
    this.disposeHelper(this.hoverBox);
    this.hoverBox = null;
    this.canvas.style.cursor = '';
  }
  setHover(object) {
    if (this.hovered === object) return;
    this.clearHover();
    if (!object || object === this.selection) return;
    this.hovered = object;
    this.hoverBox = new THREE.BoxHelper(object, HOVER_COLOR);
    this.hoverBox.name = 'VtH hover outline';
    this.hoverBox.raycast = () => {};
    this.hoverBox.material.depthTest = true;
    this.hoverBox.material.depthWrite = false;
    this.scene.add(this.hoverBox);
    this.canvas.style.cursor = 'pointer';
  }
  clearSelection() {
    this.disposeHelper(this.selectionBox);
    this.selectionBox = null;
    this.selection = null;
    this.onSelect(null);
  }
  select(object) {
    this.clearHover();
    this.clearSelection();
    if (!object || !object.visible) return;
    this.selection = object;
    this.selectionBox = new THREE.BoxHelper(object, SELECT_COLOR);
    this.selectionBox.name = 'VtH selected part';
    this.selectionBox.raycast = () => {};
    this.selectionBox.material.depthTest = true;
    this.selectionBox.material.depthWrite = false;
    this.scene.add(this.selectionBox);
    this.onSelect(object);
  }
  findHit(event) {
    if (!this.group) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.group, true);
    for (const hit of hits) {
      let obj = hit.object;
      if (!obj.isMesh || obj.userData?.vthEdgeOverlay) continue;
      let visible = true;
      while (obj && obj !== this.group.parent) {
        if (!obj.visible) { visible = false; break; }
        obj = obj.parent;
      }
      if (visible) return hit.object;
    }
    return null;
  }
  pick(event) {
    const hit = this.findHit(event);
    if (hit) this.select(hit);
    else this.clearSelection();
  }
  focusSelection() {
    if (!this.selection) return;
    const box = new THREE.Box3().setFromObject(this.selection);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = Math.max(box.getSize(new THREE.Vector3()).length(), 0.05);
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const halfH = Math.atan(Math.tan(halfFov) * Math.max(this.camera.aspect, .1));
    const minHalf = Math.min(halfFov, halfH);
    const targetDistance = Math.max(size * 0.6 / Math.sin(minHalf), this.controls.minDistance * 1.2);
    // Never zoom the camera into a component smaller than the near clipping plane.
    const distance = Math.max(targetDistance, this.camera.near * 15);
    this.transitionTo(center.clone().addScaledVector(direction, distance), center, 600);
  }
  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.updatePixelRatio();
    this.renderer.setSize(w, h, false);
    // Preserve current visitor viewpoint on ordinary window resizing.
    // Only initial load uses automatic framing.
  }
  animate() {
    if (this.cameraTransition) {
      const move = this.cameraTransition;
      const t = Math.min(1, (performance.now() - move.startTime) / move.duration);
      const eased = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(move.startPosition, move.endPosition, eased);
      this.controls.target.lerpVectors(move.startTarget, move.endTarget, eased);
      if (t >= 1) this.cameraTransition = null;
    }
    this.controls.update();
    if (this.hovered && !this.isVisibleInHierarchy(this.hovered)) this.clearHover();
    if (this.hoverBox) this.hoverBox.update();
    if (this.selectionBox && this.selection?.visible) this.selectionBox.update();
    this.renderer.render(this.scene, this.camera);
    // Measure actual rendered frames. The model stays visually identical.
    if (this.performanceReview) {
      const sample = this.performanceReview;
      sample.frames++;
      const rendered = this.renderer.info.render;
      sample.lastDrawCalls = rendered.calls;
      sample.lastTriangles = rendered.triangles;
      sample.lastLines = rendered.lines;
      const now = performance.now();
      const elapsed = now - sample.lastSample;
      if (elapsed >= sample.intervalMs) {
        const fps = sample.frames * 1000 / elapsed;
        console.info('[VtH performance]', {
          fps: Number(fps.toFixed(1)),
          drawCalls: sample.lastDrawCalls,
          triangles: sample.lastTriangles,
          lines: sample.lastLines,
          devicePixelRatio: this.appliedPixelRatio,
          structuralEdgesEnabled: this.structuralEdges?.enabled ?? 'check viewer toggle',
          viewport: `${this.canvas.clientWidth}x${this.canvas.clientHeight}`,
          geometryResources: this.renderer.info.memory.geometries,
          textures: this.renderer.info.memory.textures,
        });
        sample.frames = 0;
        sample.lastSample = now;
      }
    }
  }
}

// Illustrative geometry — NOT VtH's design dimensions or structural specification.
export function createDemo() {
  const group = new THREE.Group(); group.name = 'VtH demonstration';
  const wood = new THREE.MeshStandardMaterial({ color: 0xc49b66, roughness: .87 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xe1e8e7, roughness: .82, transparent: true, opacity: .72, depthWrite: false });
  const metal = new THREE.MeshStandardMaterial({ color: 0x697988, metalness: .53, roughness: .48 });
  const groups = {};
  for (const name of ['VTH_PERIMETER', 'VTH_FLOOR_JOISTS', 'VTH_WALLS', 'VTH_ROOF', 'VTH_CASTERS']) {
    groups[name] = new THREE.Group(); groups[name].name = name; group.add(groups[name]);
  }
  function beam(parent, name, at, dimensions, mat = wood) {
    const object = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), mat);
    object.name = name; object.position.set(...at); parent.add(object); return object;
  }
  const L = 11, W = 4.3;
  for (const x of [-L / 2, L / 2]) beam(groups.VTH_PERIMETER, 'Perimeter beam', [x, .31, 0], [.22, .62, W]);
  for (const z of [-W / 2, W / 2]) beam(groups.VTH_PERIMETER, 'Perimeter beam', [0, .31, z], [L, .62, .22]);
  for (let x = -L / 2 + .52; x < L / 2; x += .52) beam(groups.VTH_FLOOR_JOISTS, 'Floor Joist', [x, .31, 0], [.11, .5, W - .42]);
  for (const z of [-W / 2, W / 2]) { for (let x = -L / 2 + .3; x < L / 2; x += .7) beam(groups.VTH_WALLS, 'Wall stud', [x, 1.75, z], [.11, 2.9, .11]); beam(groups.VTH_WALLS, 'Wall top plate', [0, 3.21, z], [L, .16, .16]); }
  for (const x of [-L / 2, L / 2]) for (let z = -W / 2 + .3; z < W / 2; z += .7) beam(groups.VTH_WALLS, 'Wall stud', [x, 1.75, z], [.11, 2.9, .11]);
  beam(groups.VTH_ROOF, 'Roof cover', [0, 3.35, 0], [L + .3, .15, W + .3], roofMaterial);
  for (const x of [-4.9, -2.45, 0, 2.45, 4.9]) for (const z of [-W / 2, W / 2]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .18, 20), metal);
    c.name = 'Caster wheel'; c.rotation.x = Math.PI / 2; c.position.set(x, -.33, z); groups.VTH_CASTERS.add(c);
    beam(groups.VTH_CASTERS, 'Caster saddle', [x, -.02, z], [.4, .13, .34], metal);
  }
  return group;
}
