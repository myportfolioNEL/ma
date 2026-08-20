import { prefersReducedMotion, refreshMotion } from "./motion";

/**
 * lib/scroll.ts — the parts of scrolling that are identical on both builds.
 *
 * The parts that are NOT identical live in the two hooks:
 *   · hooks/useScrollDesktop.ts — a deliberately light Lenis.
 *   · hooks/useScrollMobile.ts  — no Lenis whatsoever, the platform's own
 *     scrolling, which on a phone is already smooth, already threaded off the
 *     main thread, and already exactly what the user expects.
 *
 * Whichever one is mounted registers itself here. Everything else in the app
 * talks to these three functions and never imports Lenis.
 */

export type ScrollEngine = {
  /** Animate to an absolute document offset. */
  scrollTo: (top: number) => void;
  stop: () => void;
  start: () => void;
  /** Re-read the document height after a layout change. */
  resize: () => void;
};

let engine: ScrollEngine | null = null;
let lockCount = 0;
let lockedScrollY = 0;

/** Registers the active engine. Returns the unregister function. */
export function registerScrollEngine(next: ScrollEngine): () => void {
  engine = next;
  return () => {
    if (engine === next) engine = null;
  };
}

export function getScrollEngine(): ScrollEngine | null {
  return engine;
}

/** Distance the fixed header covers, read from the CSS token, plus breathing room. */
export function headerOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--header-h",
  );
  const parsed = Number.parseFloat(raw);
  return (Number.isFinite(parsed) ? parsed : 68) + 12;
}

/**
 * Stops and starts page scrolling. Reference-counted, so two overlays closing
 * out of order cannot leave the page permanently frozen.
 *
 * The phone needs more than overflow:hidden. iOS Safari will happily keep
 * scrolling the document behind a fixed overlay, and when the overlay closes
 * the page is somewhere else entirely. Pinning the body and restoring the offset by hand is the only approach that behaves on every phone.
 */
export function setScrollLocked(locked: boolean): void {
  const root = document.documentElement;
  const body = document.body;

  if (locked) {
    lockCount += 1;
    if (lockCount > 1) return;

    lockedScrollY = window.scrollY;
    root.classList.add("is-locked");

    if (engine) {
      engine.stop();
      return;
    }

    /* Native scrolling: pin the body where it is. */
    body.style.position = "fixed";
    body.style.top = `${-lockedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return;
  }

  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  root.classList.remove("is-locked");

  if (engine) {
    engine.start();
    refreshMotion();
    return;
  }

  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  /* Restore instantly: an animated restore here reads as the page falling. */
  window.scrollTo(0, lockedScrollY);
  refreshMotion();
}

/** Scrolls to a section id, clearing the fixed header. */
export function scrollToId(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset();

  if (engine) {
    engine.scrollTo(top);
    return;
  }

  window.scrollTo({
    top,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

/** Scrolls back to the very top. */
export function scrollToTop(): void {
  if (engine) {
    engine.scrollTo(0);
    return;
  }
  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

/** Called by both engines after fonts, orientation changes and overlays. */
export function remeasureScroll(): void {
  engine?.resize();
  refreshMotion();
}
