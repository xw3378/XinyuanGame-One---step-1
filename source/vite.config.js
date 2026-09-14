import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));

// Track C (npm + Vite) because the design requires meaningful 3D.
// base: './' is REQUIRED - GitHub Pages serves the site from /<repository-name>/,
// so root-absolute asset paths would break on the published exhibition.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        index: resolve(here, 'index.html'),
        game: resolve(here, 'game.html'),
        process: resolve(here, 'process.html'),
      },
    },
  },
});
