# Virtual Tiny House — Interactive Model Explorer

This edition loads `public/models/VtH.glb` automatically and presents the Studio in a minimal, model-first interface.

## Start

Open the `threejs` folder in your editor, run:

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal. For a production build, use `npm run build`.

## Update the Studio model

Replace `threejs/public/models/VtH.glb` with the newly verified GLB. Keep the same exact filename, then refresh the browser (hard refresh if necessary). No code edit is needed.

## Features retained

- Upright placement on the casters with a small ground clearance.
- Orbit, pan, zoom, component selection, focus, reset camera.
- Component category visibility and optional ground grid.
- VtH hierarchy, original GLB metadata, and shared mesh geometry.

## Removed from the public interface

- Illustration/demo switcher and manual load button.
- Local file upload.
- Technical node/triangle counts.
- JSON hierarchy report and mapping import/export.
- Manual classification editor and isolation buttons.

The underlying componentExplorer.js still contains development capabilities; these are not exposed by the public main.js. For public hosting, review whether you want to keep unused development code in the repository.

## Caution

This is an architectural visualization, not engineering verification. Review the website's descriptions before deploying it publicly.

## Public presentation (Explorer revision)

The interface is explicitly presented as a 3D architectural explorer, not as a development/testing application. It autoloads `public/models/VtH.glb`, retains orbit/zoom/component visibility/selection/focus, and hides the ground-grid switch and technical category counts. The ground grid is disabled by default. The source model is unchanged.

The previous public-viewer candidate can be retained as a rollback copy. Review the site in the browser before publishing; no live-browser visual validation was performed during packaging.
