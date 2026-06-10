import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import nodePolyfills from "vite-plugin-node-stdlib-browser";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  base: "./",
  publicDir: "public",
  define: {
    global: "globalThis",
  },
  resolve: {
    dedupe: ["effect", "@effect/platform"],
    alias: {
      "npm:viem": "viem",
      "npm:viem/accounts": "viem/accounts",
      "npm:viem@2.37.3": "viem",
      "npm:viem@2.37.3/accounts": "viem/accounts",
      "npm:@sinclair/typebox@^0.34.41": "@sinclair/typebox",
      "npm:@sinclair/typebox@0.34.41": "@sinclair/typebox",
      "npm:@sinclair/typebox@^0.34.30": "@sinclair/typebox",
    },
  },
  build: {
    target: "esnext",
    minify: false,
    commonjsOptions: {
      transformMixedEsModules: true,
      extensions: [".js", ".cjs"],
      ignoreDynamicRequires: true,
    },
  },
  server: {
    port: 3000,
  },
  plugins: [
    glsl(),
    nodePolyfills({
      overrides: {
        fs: "memfs",
        "node:fs": "memfs",
      },
    }),
    wasm(),
  ],
  optimizeDeps: {
    exclude: ["@midnight-ntwrk/onchain-runtime"],
    esbuildOptions: {
      target: "esnext",
    },
  },
});
