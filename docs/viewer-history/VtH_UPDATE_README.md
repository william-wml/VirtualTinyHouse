# VtH Three.js Component Explorer — v0.2 update

This is an **overlay update**, not a replacement repository. It is designed for the existing VirtualTinyHouse/threejs Vite starter.

## Installation in Visual Studio

1. Commit or back up the currently working branch first.
2. Stop the running Vite server (Ctrl+C).
3. Extract this ZIP at the **VirtualTinyHouse repository root**, allowing matching files to be replaced. The archive contains a top-level `threejs/` folder.
4. Your `threejs/public/models/` files, `package.json`, `package-lock.json`, `.gitignore`, and `vite.config.js` are deliberately **not included** in this update.
5. For the button **Load VtH GLB**, place a copy of your working GLB at `threejs/public/models/VtH.glb`. You can alternatively use the local-file chooser to load your existing GLB without renaming it.
6. In Visual Studio > Terminal, from `threejs/`, run `npm.cmd run dev` (or `npm run dev` if PowerShell permits it).
7. Test the demonstration first, then the actual VtH GLB.
8. Run `npm.cmd run build` for a production-build check. Review Git Changes before committing.

## New features

- VtH terminology in interface, title, and JavaScript viewer class.
- Recursive inspection of the complete glTF hierarchy (no 35-object limit).
- Roof, walls, floor joists, perimeter/ledgers, subfloor, casters, fasteners, and unclassified categories.
- Show all / hide all, category checkboxes, and per-category isolate.
- Click to select an individual mesh with a temporary bounding-box indicator; Focus and Clear controls.
- Downloadable `VtH_GLB_Hierarchy_Report.json` to aid review of export names.

## What the categories mean

Classification is **name-based and heuristic**, not inferred from geometric shape or construction semantics. The closest named node is checked first. A generic name like `Cube.011` will be classified as Unclassified unless a parent contains a useful category name. If different kinds of components have already been joined into one mesh, the viewer cannot hide them individually. In that case, improve the Blender export hierarchy.

Edit `src/componentExplorer.js` to refine the matching rules once you inspect the hierarchy report. The viewer does not move or modify your VtH geometry.

## Safety

This update does not include or overwrite the original root `README.md`, Wiki, any `.blend` file, `public/models/`, existing `package-lock.json`, or `node_modules/`. ZIP extraction only replaces matching included files; it will not automatically delete old files. Uncommitted changes to included website code **can** be overwritten, so back them up or commit first.

## Notes

Click-to-select works on renderable mesh objects; picking a single instance within an InstancedMesh may highlight the entire InstancedMesh, and instances from Geometry Nodes may require Blender-side realization for separate selection. For large imported scenes, the hierarchy report may be quite large. Imported models should be trusted because a model file can stress GPU/browser resources.
