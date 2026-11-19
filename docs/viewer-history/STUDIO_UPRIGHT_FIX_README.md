# VtH — Upright Studio viewer fix

The uploaded Three.js project already contained `src/utils/studioPositioning.js` and
an import in `src/main.js`, but the positioning function was never called. This
update wires it into the real GLB load path and adjusts the grid to Y=0.

## Easiest method (full prepared project)

1. Back up your current `threejs` folder.
2. Extract `VtH_ThreeJS_Upright_Ready.zip` into a temporary folder.
3. Open its `threejs` folder in Visual Studio. This is the complete project,
   including `public/models/VtH.glb`, but excluding automatically installed
   `node_modules` dependencies.
4. In the Visual Studio terminal in that `threejs` folder, run:
   `npm install` followed by `npm run dev`.
5. Visit the local URL printed by Vite. Click **Load Studio GLB** or use the
   file input to test a newer GLB. The demo remains unchanged.

## Minimal method (keep your existing folder)

Extract `VtH_ThreeJS_Upright_Patch.zip`. Copy its three files into matching
locations in your existing project, replacing the existing versions:
- `threejs/src/main.js`
- `threejs/src/viewer.js`
- `threejs/src/utils/studioPositioning.js`

No GLB needs replacement; the project already included `public/models/VtH.glb`.
Restart Vite (`npm run dev`) and reload the browser.

## Technical details

The fix rotates the entire loaded GLB -90 degrees around viewer X, centers its
world X/Z bounding box and places the lowest geometry at Y=0.02. Existing
component metadata, object names and geometry are unchanged. The camera still
auto-frames the model. The viewer grid uses Y=0 for a positioned GLB.

The -90-degree choice is grounded in the uploaded model's caster components
appearing at glTF Z about -1.676, compared with roof framing near +0.859.
A positive 90-degree rotation would put the caster side on top.

If a future GLB changes axes, adjust `rotationX` in `src/main.js`.
