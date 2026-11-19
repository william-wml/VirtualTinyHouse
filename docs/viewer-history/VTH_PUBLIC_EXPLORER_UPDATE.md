# VtH Interactive Model Explorer — Classification and Identity Update

This update turns the public interface's classifications into a direct reflection of Blender export metadata. It keeps the original viewer's upright orientation, navigation, component selection, and existing `/models/VtH.glb` path.

## Public category mapping

- Roof framing: `VTH_ROOF_FRAMING`, `VTH_ROOF_BLOCKS`, `VTH_ROOF_COVERING`
- Wall framing: `VTH_WALL_STUDS`, `VTH_WALL_PLATES`, `VTH_WALL_HEADERS`, `VTH_WALL_BLOCKS`
- Floor framing: `VTH_FLOOR_JOISTS`, `VTH_FLOOR_BLOCKS`, `VTH_FLOOR_HANGERS`, `VTH_FLOOR_SUBFLOOR`
- Perimeter & ledgers: `VTH_FLOOR_LEDGERS`, `VTH_BUILT_UP_BEAMS`
- Casters & saddles: `VTH_CASTERS`, `VTH_SADDLES`
- Fasteners: `VTH_FASTENERS_LEDGER`, `VTH_FASTENERS_PLATES`, `VTH_FASTENERS_OTHER`

The mapping uses each mesh node's `userData.vth_category` first. Name-based matching is reserved for mesh nodes without that metadata. The VtH brand is now consistently displayed as `VtH`; the introduction reads `Explore VtH.`

## Installation

**Complete-project ZIP:** Back up your current Three.js folder. Extract this ZIP to a different location, open its `threejs` directory in your editor, and run `npm install` followed by `npm run dev`. Test before replacing your working project.

**Update-only ZIP:** With the current project backed up, extract the archive into your project root preserving paths. It replaces `threejs/src/componentExplorer.js`, `threejs/src/main.js`, `threejs/src/style.css`, and `threejs/index.html`. If extracting inside the existing `threejs` directory, copy files from the ZIP's inner `threejs` directory to the matching existing paths.

The bundled `public/models/VtH.glb` is **not** changed by this update. New approved GLB files can be copied into that location using the filename `VtH.glb`.

## Checks

- Six public categories cover all 1,578 mesh nodes in the bundled GLB.
- Classification-specific tests confirm that a caster mounting plate maps to Casters & saddles, an SD9212 fastener to Fasteners, and a built-up beam to Perimeter & ledgers.
- JavaScript syntax checks passed.
- Live browser appearance and navigation testing should be performed locally.
