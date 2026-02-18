import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  base: './', // Use relative paths for assets
  publicDir: 'public', // Serve and copy images from public/ at build (e.g. /win_1_race.png)
  define: {
    global: 'globalThis',
  },

  build: {
    target: 'esnext'
  },
  server: {
    port: 3000
  },
  plugins: [ glsl(),
     nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
   ]
});
