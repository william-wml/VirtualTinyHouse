// VtH public-release static audit (Node.js built-ins only).
// Run from the threejs directory: npm run audit
// This checks the bundled model and project structure, not browser rendering.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const base = resolve(import.meta.dirname, '..');
const problems = [];
const checks = [];
const pass = (label, condition, detail = '') => {
  checks.push({ label, ok: Boolean(condition), detail });
  if (!condition) problems.push(`${label}${detail ? ': ' + detail : ''}`);
};

const required = [
  'index.html', 'package.json', 'src/main.js', 'src/viewer.js',
  'src/lighting.js', 'src/structuralEdges.js', 'src/componentExplorer.js',
  'src/componentDescriptions.js', 'src/utils/studioPositioning.js',
  'public/models/VtH.glb'
];
for (const path of required) pass(`Required file ${path}`, existsSync(resolve(base, path)));

const html = existsSync(resolve(base, 'index.html'))
  ? readFileSync(resolve(base, 'index.html'), 'utf8') : '';
for (const id of [
  'viewer', 'model-loading', 'loading-title', 'loading-message',
  'loading-track', 'loading-fill', 'loading-percent', 'loading-retry',
  'component-list', 'reset-btn', 'show-all-btn', 'edges-toggle',
  'selection-name', 'selection-category', 'selection-description',
  'focus-btn', 'clear-btn', 'status'
]) pass(`UI element #${id}`, new RegExp(`id=["']${id}["']`).test(html));

const url = resolve(base, 'public/models/VtH.glb');
if (existsSync(url)) {
  const bytes = readFileSync(url);
  pass('GLB binary header', bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'glTF');
  pass('GLB 2.0 version', bytes.length >= 20 && bytes.readUInt32LE(4) === 2);
  pass('GLB declared size', bytes.length >= 20 && bytes.readUInt32LE(8) === bytes.length);
  if (bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'glTF') {
    try {
      const size = bytes.readUInt32LE(12);
      const jsonType = bytes.readUInt32LE(16);
      pass('GLB first chunk is JSON', jsonType === 0x4e4f534a);
      pass('GLB JSON fits file', size + 20 <= bytes.length);
      const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + size));
      const nodes = gltf.nodes ?? [];
      const meshNodes = nodes.filter(node => Number.isInteger(node.mesh));
      const meshes = gltf.meshes ?? [];
      const sourceIds = meshNodes.map(node => node.extras?.vth_source_object);
      const categoryCounts = {};
      const casterCounts = {};
      const fastenerRefs = new Map();
      let fastenerCount = 0;
      for (const node of meshNodes) {
        const e = node.extras ?? {};
        categoryCounts[e.vth_category ?? 'MISSING'] = (categoryCounts[e.vth_category ?? 'MISSING'] ?? 0) + 1;
        if (e.vth_assembly) casterCounts[e.vth_assembly] = (casterCounts[e.vth_assembly] ?? 0) + 1;
        if (e.vth_representation === 'BASE_GEOMETRY_SHARED') {
          fastenerCount++;
          if (!fastenerRefs.has(e.vth_geometry_fingerprint)) fastenerRefs.set(e.vth_geometry_fingerprint, new Set());
          fastenerRefs.get(e.vth_geometry_fingerprint).add(node.mesh);
        }
      }
      // v5.9 baseline; adjust expectations deliberately when a new export is approved.
      pass('1,578 renderable GLB nodes', meshNodes.length === 1578, `found ${meshNodes.length}`);
      pass('561 GLB mesh definitions', meshes.length === 561, `found ${meshes.length}`);
      pass('Every mesh has source/category metadata', meshNodes.every(node => node.extras?.vth_source_object && node.extras?.vth_category));
      pass('10 caster assemblies with 7 components each', Object.keys(casterCounts).length === 10 && Object.values(casterCounts).every(c => c === 7));
      pass('240 base-geometry fasteners / six shared definitions', fastenerCount === 240 && fastenerRefs.size === 6 && [...fastenerRefs.values()].every(refs => refs.size === 1));
      const sill = meshNodes.filter(node => node.extras?.vth_source_object === '04-0001-001.10567');
      pass('Window rough sill included once', sill.length === 1 && sill[0].extras?.vth_category === 'VTH_WALL_BLOCKS');
      console.log(`\nGLB: ${(bytes.length/1048576).toFixed(2)} MiB | ${meshNodes.length} mesh nodes | ${meshes.length} geometry definitions`);
      console.log('Export categories:', categoryCounts);
    } catch (error) {
      pass('GLB JSON parsing', false, error.message);
    }
  }
}
console.log('\nVtH public-release static audit');
for (const {label, ok, detail} of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}
console.log(`\n${checks.filter(x=>x.ok).length}/${checks.length} checks passed.`);
if (problems.length) {
  console.error('Release audit failed. Preserve the previous working deployment.');
  process.exitCode = 1;
} else {
  console.log('Static audit passed. Browser, performance, and production-build testing remain necessary.');
}
