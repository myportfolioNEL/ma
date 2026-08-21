import { useEffect } from "react";
import { STAGGER, prefersReducedMotion } from "../lib/motion";

/**
 * useReveal — the site's only entrance animation.
 *
 * Any element carrying data-reveal animates in once, when it actually enters
 * the viewport. This hook does not animate anything itself: it adds one class
 * and writes one delay, and the stylesheet owns the movement.
 *
 * Why IntersectionObserver and not ScrollTrigger.batch:
 *
 *   The four lower sections are content-visibility:auto. Until one of them is
 *   near the viewport the browser does not lay out its subtree, so every
 *   [data-reveal] inside it reports a zero-size box at zero,zero. A trigger
 *   whose position is cached from that box fires at a meaningless scroll
 *   offset, or never fires at all — and once:true means it never gets a
 *   second chance. IntersectionObserver reports real intersection instead of
 *   a cached number, so it is immune to both content-visibility and to the
 *   document height changing while you scroll.
 */

/** Seconds between elements that enter together. Written as a CSS delay. */
const STEP_DELAY = 0.03;

/** Reveal slightly before the edge, so nothing animates under the fold line. */
const ROOT_MARGIN = "0px 0px -8% 0px";

/** Elements entering within this window share one cascade. */
const BATCH_MS = 50;

/** DOM churn is bursty (the letter engine rewrites headings). Coalesce it. */
const MUTATION_MS = 120;

/** Throttle for the on-screen safety sweep. */
const SWEEP_MS = 300;

export function useReveal(): void {
  useEffect(() => {
    const revealed = new WeakSet<HTMLElement>();

    /** Adds the class, and the delay the element actually asked for. */
    const reveal = (element: HTMLElement, order: number): void => {
      if (element.classList.contains("is-in")) return;

      /* data-reveal-delay is written by Reveal.tsx and was never read by
         anything. Honour it, and let a batch cascade on top of it. */
      const own = Number.parseFloat(element.dataset.revealDelay ?? "0");
      const delay = Math.max(Number.isFinite(own) ? own : 0, order * STEP_DELAY);
      if (delay > 0) {
        element.style.setProperty("--rd", `${delay.toFixed(3)}s`);
      }

      element.classList.add("is-in");
    };

    const all = (): NodeListOf<HTMLElement> =>
      document.querySelectorAll<HTMLElement>("[data-reveal]");

    /* Reduced motion: everything is already in place. Still watch the DOM, so
       an overlay opened later is not born invisible. */
    if (prefersReducedMotion()) {
      const paint = () => all().forEach((element) => reveal(element, 0));
      paint();
      const observer = new MutationObserver(paint);
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }

    let queue: HTMLElement[] = [];
    let batchTimer = 0;

    const flush = (): void => {
      batchTimer = 0;
      const entering = queue;
      queue = [];
      entering.forEach((element, order) => reveal(element, order));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer.unobserve(element);
          queue.push(element);
        }
        if (queue.length > 0 && batchTimer === 0) {
          batchTimer = window.setTimeout(flush, BATCH_MS);
        }
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );

    const adopt = (): void => {
      all().forEach((element) => {
        if (revealed.has(element)) return;
        revealed.add(element);
        if (element.classList.contains("is-in")) return;
        observer.observe(element);
      });
    };

    adopt();

    /* Elements that mount after this hook: a language switch, the case-study
       overlay, anything lazy. The old implementation queried the document once
       and never looked again. */
    let mutationTimer = 0;
    const mutations = new MutationObserver(() => {
      if (mutationTimer !== 0) return;
      mutationTimer = window.setTimeout(() => {
        mutationTimer = 0;
        adopt();
      }, MUTATION_MS);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    /* The rule this hook exists to keep: nothing on screen is invisible.
       Only ever touches elements that are still hidden, so the working set
       shrinks to nothing and the sweep becomes free. */
    let sweepTimer = 0;
    const sweep = (): void => {
      sweepTimer = 0;
      const hidden = document.querySelectorAll<HTMLElement>(
        "[data-reveal]:not(.is-in)",
      );
      if (hidden.length === 0) return;

      const bottom = window.innerHeight + 120;
      hidden.forEach((element) => {
        const rect = element.getBoundingClientRect();
        /* A zero box means the subtree is still skipped by
           content-visibility. Not hidden — not rendered. Leave it alone. */
        if (rect.width === 0 && rect.height === 0) return;
        if (rect.top < bottom && rect.bottom > -120) reveal(element, 0);
      });
    };

    const requestSweep = (): void => {
      if (sweepTimer !== 0) return;
      sweepTimer = window.setTimeout(sweep, SWEEP_MS);
    };

    window.addEventListener("scroll", requestSweep, { passive: true });
    window.addEventListener("resize", requestSweep, { passive: true });
    const firstSweep = window.setTimeout(sweep, 1200);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", requestSweep);
      window.removeEventListener("resize", requestSweep);
      window.clearTimeout(batchTimer);
      window.clearTimeout(mutationTimer);
      window.clearTimeout(sweepTimer);
      window.clearTimeout(firstSweep);
    };
  }, []);
}

/**
 * staggerDelay — opt-in helper for grids that should cascade rather than
 * appear as one block. Applies an incremental data-reveal-delay.
 */
export function staggerDelay(index: number): string {
  return String(index * STAGGER.item);
}
