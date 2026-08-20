/// <reference types="vite/client" />

/**
 * Ambient types for asset imports. Without this file TypeScript rejects
 * `import logo from "./logo.svg"` and Vite's import.meta.env.
 */

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}
