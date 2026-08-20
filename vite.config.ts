import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * vite.config.ts
 *
 * base: "./" produces relative asset URLs, which is what makes the same build
 * work on GitHub Pages under /portfolio/, on Netlify at the root, and inside
 * the AI Studio preview — without editing anything.
 *
 * manualChunks splits the animation runtime away from React so a change to a
 * component never invalidates the cached GSAP chunk for returning visitors.
 */
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2020",
    cssTarget: "chrome90",
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          motion: ["gsap", "lenis"],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
