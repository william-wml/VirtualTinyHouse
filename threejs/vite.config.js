import { defineConfig } from 'vite';

// Relative production assets work in local preview and subdirectory hosting.
// The model URL is formed with import.meta.env.BASE_URL in src/main.js.
export default defineConfig({
  base: './',
});
