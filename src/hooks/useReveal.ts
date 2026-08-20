import { useEffect } from "react";
import { STAGGER, ScrollTrigger, gsap, prefersReducedMotion } from "../lib/motion";
import { requestMeasure } from "../lib/measure";

/**
 * useReveal - the site's only entrance animation.
 *
 * Any element carrying data-reveal animates in once, when it is about to
 * enter the viewport. This hook does not animate anything itself: it adds one
 * class, and the stylesheet owns the movement. One owner per property, and the
 * cheapest possible owner.
 *
 * CSS owns the "before" state too, so there is never a flash of finished
 * content before JavaScript runs.
 */

/** Seconds between elements that enter together. Written as a CSS delay. */
const STEP_DELAY = 0.03;

/** Milliseconds after mount when anything still hidden on screen is shown. */
const FAIL_OPEN = 1600;

function show(element: HTMLElement, order: number): void {
  if (element.classList.contains("is-in")) return;
  if (order > 0) {
    element.style.setProperty("--rd", `${(order * STEP_DELAY).toFixed(3)}s`);
  }
  element.classList.add("is-in");
}

export function useReveal(): void {
  useEffect(() => {
    const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
    if (targets.length === 0) return;

    /* Reduced motion: everything is already in place, nothing is registered. */
    if (prefersReducedMotion()) {
      targets.forEach((element: HTMLElement) => element.classList.add("is-in"));
      return;
    }

    const batch = ScrollTrigger.batch(targets, {
      /* 92%: begins entering when clearly inside viewport */
      start: "top 92%",
      once: true,
      batchMax: 8,
      interval: 0.05,
      onEnter: (elements: Element[]) => {
        elements.forEach((element: Element, order: number) => {
          show(element as HTMLElement, order);
        });
      },
    });

    /* Anything that changes layout after first paint moves every trigger
       position below it. Both of these are idempotent because once: true. */
    const refresh = () => requestMeasure();
    if (document.fonts) {
      document.fonts.ready.then(refresh).catch(() => {});
    }
    window.addEventListener("load", refresh, { once: true });

    /* Fail open. Never leave a visible element invisible. */
    const failOpen = window.setTimeout(() => {
      const bottom = window.innerHeight + 200;
      targets.forEach((element: HTMLElement) => {
        if (element.classList.contains("is-in")) return;
        const rect = element.getBoundingClientRect();
        if (rect.top < bottom && rect.bottom > -200) show(element, 0);
      });
    }, FAIL_OPEN);

    return () => {
      window.clearTimeout(failOpen);
      window.removeEventListener("load", refresh);
      batch.forEach((trigger: ScrollTrigger) => trigger.kill());
    };
  }, []);
}

/**
 * staggerDelay - opt-in helper for grids that should cascade rather than
 * appear as one block. Applies an incremental data-reveal-delay.
 */
export function staggerDelay(index: number): string {
  return String(index * STAGGER.item);
}
