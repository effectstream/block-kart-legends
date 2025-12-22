import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: './', // Use relative paths for assets
  define: {
    global: 'globalThis',
  },
  build: {
    target: 'esnext'
  },
  server: {
    port: 3000
  },
  plugins: [ glsl() ]
});
