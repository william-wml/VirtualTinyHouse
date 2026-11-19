// VtH Interactive Model Explorer — public categories anchored to Blender's
// exported vth_category metadata. No source GLB edits are required.
export const CATEGORIES = [
  { id: 'roof', label: 'Roof framing' },
  { id: 'walls', label: 'Wall framing' },
  { id: 'floorJoists', label: 'Floor framing' },
  { id: 'perimeter', label: 'Perimeter & ledgers' },
  { id: 'casters', label: 'Casters & saddles' },
  { id: 'fasteners', label: 'Fasteners' },
];

// These keys are written by the Blender exporter on each renderable mesh.
// Built-up beams and ledgers remain separate in Blender, but share a concise
// category for public exploration. Every VtH export leaf is accounted for.
export const BLENDER_CATEGORY_MAP = Object.freeze({
  VTH_ROOF_FRAMING: 'roof',
  VTH_ROOF_BLOCKS: 'roof',
  VTH_ROOF_COVERING: 'roof',
  VTH_WALL_STUDS: 'walls',
  VTH_WALL_PLATES: 'walls',
  VTH_WALL_HEADERS: 'walls',
  VTH_WALL_BLOCKS: 'walls',
  VTH_FLOOR_JOISTS: 'floorJoists',
  VTH_FLOOR_BLOCKS: 'floorJoists',
  VTH_FLOOR_HANGERS: 'floorJoists',
  VTH_FLOOR_SUBFLOOR: 'floorJoists',
  VTH_FLOOR_LEDGERS: 'perimeter',
  VTH_BUILT_UP_BEAMS: 'perimeter',
  VTH_CASTERS: 'casters',
  VTH_SADDLES: 'casters',
  VTH_FASTENERS_LEDGER: 'fasteners',
  VTH_FASTENERS_PLATES: 'fasteners',
  VTH_FASTENERS_OTHER: 'fasteners',
});

// Older or user-supplied models may lack vth_category metadata. In that case
// infer a category from ancestors and names; avoid silently treating an
// unknown present category as if it were authoritative.
const FALLBACK_RULES = [
  ['fasteners', /fastener|screw|bolt|\bnut\b|washer|sdws|sdcp|sd9212|\blag\b|hex[ ._-]*cap/i],
  ['casters', /caster|saddle|wheel|axle|cruciform/i],
  ['roof', /roof|rafter|ceiling[ ._-]*joist/i],
  ['perimeter', /built[ ._-]*up[ ._-]*beam|perimeter|\blvl\b|ledger|rim[ ._-]*(board|joist)/i],
  ['floorJoists', /floor[ ._-]*joist|subfloor|\bosb\b|floor[ ._-]*block|joist[ ._-]*hanger/i],
  ['walls', /wall|stud|header|sill|blocking|plate/i],
];
const VALID = new Set(CATEGORIES.map(c => c.id));
const renderable = obj => !obj.userData?.vthEdgeOverlay && (obj.isMesh || obj.isSkinnedMesh || obj.isInstancedMesh || obj.isLine || obj.isPoints);

function fallbackCategory(path) {
  for (let i = path.length - 1; i >= 0; i--) {
    for (const [id, re] of FALLBACK_RULES) {
      if (re.test(path[i])) return [id, 'fallback-name'];
    }
  }
  return [null, 'unclassified'];
}

function classify(object, path) {
  const raw = object.userData?.vth_category;
  if (typeof raw === 'string' && raw.trim()) {
    if (Object.hasOwn(BLENDER_CATEGORY_MAP, raw)) return [BLENDER_CATEGORY_MAP[raw], 'glb-metadata'];
    return [null, 'unknown-metadata']; // Do not override an unknown explicit classification.
  }
  return fallbackCategory(path);
}

export class ComponentExplorer {
  constructor(root) {
    this.root = root;
    this.entries = [];
    this.byMesh = new Map();
    this.byPath = new Map();
    this.overrides = {};
    const walk = (object, names, segments) => {
      const name = object.name || `(unnamed ${object.type})`;
      const siblingIndex = object.parent
        ? object.parent.children.filter(x => (x.name || `(unnamed ${x.type})`) === name).indexOf(object)
        : 0;
      const path = [...names, name];
      const stableSegments = [...segments, `${name}#${siblingIndex}`];
      if (renderable(object)) {
        const [id, via] = classify(object, path);
        const entry = {
          object, id, autoCategory: id, matchMethod: via,
          path: path.join(' / '), key: stableSegments.join(' / '), name,
          type: object.type, blenderCategory: object.userData?.vth_category || null,
        };
        this.entries.push(entry);
        this.byMesh.set(object, entry);
        this.byPath.set(entry.key, entry);
      }
      for (const child of object.children) walk(child, path, stableSegments);
    };
    walk(root, [], []);
  }

  getCounts() {
    const counts = new Map(CATEGORIES.map(c => [c.id, 0]));
    for (const entry of this.entries) {
      if (counts.has(entry.id)) counts.set(entry.id, counts.get(entry.id) + 1);
    }
    return CATEGORIES.map(c => ({ ...c, count: counts.get(c.id) }));
  }

  setVisible(ids) {
    const enabled = new Set(ids);
    this.root.traverse(obj => { if (!renderable(obj) && !obj.userData?.vthEdgeOverlay) obj.visible = true; });
    for (const entry of this.entries) {
      // Unknown parts are never silently hidden; visitor can still inspect them.
      entry.object.visible = entry.id == null || enabled.has(entry.id);
    }
  }

  get(object) { return this.byMesh.get(object) || null; }

  // Keep optional programmatic mapping API for compatibility, but no public UI.
  assign(object, id) {
    if (!VALID.has(id)) throw new Error(`Unknown category: ${id}`);
    const entry = this.get(object);
    if (!entry) return false;
    entry.id = id;
    entry.matchMethod = 'manual';
    this.overrides[entry.key] = id;
    return true;
  }

  loadMappings(data) {
    if (!data || data.format !== 'VtH-component-map-v1' || typeof data.overrides !== 'object' || !data.overrides || Array.isArray(data.overrides)) {
      throw new Error('Invalid VtH category mapping.');
    }
    let matched = 0, unknown = 0;
    for (const [key, id] of Object.entries(data.overrides)) {
      const entry = this.byPath.get(key);
      if (!entry || !VALID.has(id)) { unknown++; continue; }
      this.assign(entry.object, id);
      matched++;
    }
    return { matched, unknown };
  }

  exportMappings(source) {
    return { format: 'VtH-component-map-v1', source, overrides: { ...this.overrides } };
  }
}
