# VirtualTinyHouse — Three.js starter

This is a **local development template**, not a replacement for the main GitHub `README.md` or Wiki.

## Install and run in Microsoft Visual Studio

1. Clone the main `VirtualTinyHouse` repository and switch to `threejs-development`.
2. Extract this ZIP so the project is `VirtualTinyHouse/threejs/` (not `threejs/threejs/`).
3. In Visual Studio: **File → Open → Folder**, select the main repository or `threejs` folder.
4. In **View → Terminal**, navigate to the `threejs` directory.
5. Install a compatible Node.js LTS (Vite 7 requires Node 20.19+ or 22.12+).
6. Run:

```powershell
npm install
npm run dev
```

Open the URL displayed by Vite (usually `http://127.0.0.1:5173/`). Use **Demo model** initially.

## Load your real Studio GLB

Copy an optimized binary glTF model to `public/models/studio.glb`, then click **Load Studio GLB**. Alternatively, select a `.glb` file using the local file chooser. A browser file chooser can load a self-contained GLB but is not designed to resolve arbitrary external assets from a `.gltf` package.

The demonstration is simplified placeholder geometry and **does not represent verified Studio dimensions or structural adequacy**. The app currently supports top-level component visibility. It does not yet render Blender compositor effects, fastener X-ray overlays, or `EXT_mesh_gpu_instancing` optimization by itself.

## Production testing

```powershell
npm run build
npm run preview
```

Vite builds to `dist/`. The production base path is `/VirtualTinyHouse/` for an eventual project Pages deployment; local development uses `/`. Do not commit `node_modules/` or `dist/`. Commit `package.json` and the generated `package-lock.json` after the first successful npm install.

## Git workflow

```powershell
git status
git add threejs/
git commit -m "Initialize Three.js local viewer"
git push -u origin threejs-development
```

Pushing this development branch does **not** update the `master` README or a Pages deployment configured only for `master`. The Wiki is a distinct Git repository and is not changed by this ZIP.

## Files

- `src/main.js`: application logic and UI controls
- `src/viewer.js`: WebGL renderer, demo geometry, camera framing
- `src/controls.js`: OrbitControls
- `src/lighting.js`: white-background lighting
- `src/modelLoader.js`: GLB loader
- `src/style.css`: presentation styling
- `vite.config.js`: local vs project Pages base paths

## Troubleshooting

- **`npm` not recognized**: install Node.js and reopen Visual Studio.
- **Blank viewer**: open browser developer console (F12); check WebGL support.
- **Load Studio GLB fails**: verify `public/models/studio.glb` exists, the name matches, and run through `npm run dev` rather than opening `index.html` as a file.
- **Wrong scale or orientation**: correct Blender export transforms; camera auto-frames the imported model but does not rotate it.
- **Extra master objects**: exclude them in Blender's export set. The viewer loads everything present in the GLB.
- **Model is heavy**: simplify repeated fasteners and materials before exporting.

Reference: https://vite.dev/guide/ and https://threejs.org/manual/pages/installation.html
