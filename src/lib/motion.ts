import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * motion.ts — the single place GSAP is configured.
 *
 * Rules enforced by having one file:
 *  1. registerPlugin runs exactly once, at module load, before any component
 *     can create a ScrollTrigger.
 *  2. Every duration and easing in the site comes from DUR / EASE. A magic
 *     number in a component is a bug.
 *  3. Reduced motion is answered by one function, so it can never be half
 *     implemented.
 */

gsap.registerPlugin(ScrollTrigger);

/** Easings. Names map 1:1 to the CSS variables in tokens.css. */
export const EASE = {
  /* expo.out يقطع 90% في الثلث الأوّل من الزمن ثم يزحف. power3.out يوزّع الزمن
     بإنصاف، فتبدو الحركة أسرع عند نفس المدّة المكتوبة. */
  out: "power3.out",
  soft: "power3.out",
  inOut: "power2.inOut",
  /** For clip-path / curtain reveals. */
  cover: "power4.inOut",
} as const;

/* ROUND 28: متوافقة مع --d-2 / --d-3 / --d-4 في tokens.css. إن تغيّر أحدهما فليتغيّر
   الآخر معه، وإلاّ اختلف إيقاع ما يتحرّك بالورقة عمّا يتحرّك بالشيفرة. */
export const DUR = {
  fast: 0.22,
  base: 0.4,
  slow: 0.7,
  hero: 0.9,
} as const;

/* التتالي هو ما يجمع المدد: عشرون عنصراً × 0.08 = 1.6s قبل أن يدخل الأخير.
   بـ 0.05 تصير المدّة ثانية، والتتالي لا يزال مقروءاً. */
export const STAGGER = {
  char: 0.016,
  line: 0.06,
  item: 0.05,
} as const;

gsap.defaults({ ease: EASE.out, duration: DUR.base });

/** True when the visitor asked the operating system for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Kills every ScrollTrigger and refreshes measurement. Call after a layout
 * change that GSAP cannot observe (fonts loaded, overlay closed, image sized).
 */
export function refreshMotion(): void {
  ScrollTrigger.refresh();
}

export { gsap, ScrollTrigger };
