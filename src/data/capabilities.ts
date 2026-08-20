import type { Capability } from "../types";

/**
 * capabilities.ts — a skill is listed only when something shipped proves it.
 * The `proof` field is that evidence and it is rendered next to the claim.
 * No star ratings and no percentage bars: nobody can check them, and
 * everybody writes 90%.
 */
export const capabilities: Capability[] = [
  {
    index: "A",
    title: "Engineering",
    items: [
      { name: "React 19 + TypeScript", proof: "256 components" },
      { name: "State architecture", proof: "Zustand · context" },
      { name: "Vite build pipelines", proof: "3 products" },
      { name: "Vitest + Playwright", proof: "302 tests" },
      { name: "CI/CD, reviews, CodeQL", proof: "15 pipelines" },
    ],
  },
  {
    index: "B",
    title: "Interface & motion",
    items: [
      { name: "Design systems in CSS", proof: "token-driven" },
      { name: "GSAP + ScrollTrigger", proof: "this site" },
      { name: "WebGL / GLSL", proof: "this site" },
      { name: "Accessibility", proof: "WCAG 2.1 AA" },
      { name: "Performance budgets", proof: "Lighthouse CI" },
    ],
  },
  {
    index: "C",
    title: "Product & language",
    items: [
      { name: "Writing decisions down", proof: "decision records" },
      { name: "i18n + RTL", proof: "AR · FR · EN" },
      { name: "Web Audio engines", proof: "NL" },
      { name: "Image pipelines", proof: "WebP · LQIP" },
      { name: "Music production", proof: "released as NL" },
    ],
  },
];
