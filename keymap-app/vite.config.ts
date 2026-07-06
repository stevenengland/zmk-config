import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// vite-plugin-singlefile inlines every JS/CSS/asset into one index.html so the
// production build opens directly from the filesystem via file:// with no server.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  // Inline every asset (including the embedded woff2 font subset) as a base64
  // data: URI so the single-file build carries no external asset references.
  build: { assetsInlineLimit: Number.MAX_SAFE_INTEGER },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
