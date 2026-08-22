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
 * talks to these functions and never imports Lenis.
 *
 * TWO THINGS CHANGED HERE, AND BOTH WERE BUGS THAT LOST THE VISITOR'S PLACE.
 *
 * 1. LOCKS ARE OWNED, NOT COUNTED. A plain counter trusts every caller to
 *    push and pop exactly once. The app shells do not: their effect body runs
 *    `setScrollLocked(openProject !== null)` on every change, so closing a
 *    project called unlock even when the CV reader was the one holding the
 *    lock — releasing a pin somebody else had taken, which on a phone drops
 *    the document back to the top while a full-screen window is still open.
 *    An owner cannot release a lock it never took, and taking the same lock
 *    twice is free.
 *
 * 2. THE OFFSET IS RESTORED ON BOTH ENGINES. The old unlock only restored the
 *    offset on the native path. On the desktop path it removed the class,
 *    started Lenis and hoped — but html.is-locked is overflow:hidden on the
 *    element Lenis scrolls, and the browser is entitled to clamp a scroll
 *    offset on an element that cannot scroll. Restoring is now unconditional,
 *    and it is applied again after ScrollTrigger.refresh(), because a refresh
 *    is itself allowed to move the scroller.
 */

export type ScrollEngine = {
  /** Animate to an absolute document offset. */
  scrollTo: (top: number) => void;
  /**
   * Absolute offset, this frame, no animation. Must work while the engine is
   * stopped — restoring a place happens with overlays still closing.
   */
  jump?: (top: number) => void;
  stop: () => void;
  start: () => void;
  /** Re-read the document height after a layout change. */
  resize: () => void;
};

let engine: ScrollEngine | null = null;
let lockedScrollY = 0;
let legacyDepth = 0;

/** Who is currently holding the page still. Empty means the page is free. */
const owners = new Set<string>();

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

/** The document offset, from whichever property this browser answers on. */
export function currentScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

/**
 * Absolute offset, immediately, no animation and no easing. This is the one
 * used to restore a place: an animated restore reads as the page falling.
 */
export function scrollToExact(top: number): void {
  const target = Math.max(0, Math.round(top));
  if (engine?.jump) {
    engine.jump(target);
    return;
  }
  window.scrollTo(0, target);
}

export function isScrollLocked(): boolean {
  return owners.size > 0;
}

/**
 * The offset the page is really at. While a lock is held the phone's body is
 * pinned and window.scrollY reads zero, so anything writing the visitor's
 * place down must ask here instead.
 */
export function lockedScrollTop(): number {
  return owners.size > 0 ? lockedScrollY : currentScrollY();
}

function freeze(): void {
  const root = document.documentElement;
  const body = document.body;

  lockedScrollY = currentScrollY();
  root.classList.add("is-locked");

  if (engine) {
    engine.stop();
    return;
  }

  /* Native scrolling: pin the body where it is. iOS Safari will happily keep
     scrolling the document behind a fixed overlay otherwise. */
  body.style.position = "fixed";
  body.style.top = `${-lockedScrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
}

function clearPin(): void {
  const body = document.body;
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
}

function thaw(): void {
  document.documentElement.classList.remove("is-locked");

  if (engine) engine.start();
  else clearPin();

  scrollToExact(lockedScrollY);
  refreshMotion();

  /* A refresh re-measures every trigger and may itself move the scroller. */
  if (Math.abs(currentScrollY() - lockedScrollY) > 1) scrollToExact(lockedScrollY);

  window.requestAnimationFrame(() => {
    if (owners.size > 0) return;
    if (Math.abs(currentScrollY() - lockedScrollY) > 1) scrollToExact(lockedScrollY);
  });
}

/**
 * Freezes the page for one named owner: "case", "sheet", "reader". Taking a
 * lock twice under the same name is a no-op, which is what makes it safe to
 * call from an effect body that runs on every render.
 */
export function lockScroll(owner: string): void {
  if (owners.has(owner)) return;
  const wasFree = owners.size === 0;
  owners.add(owner);
  if (wasFree) freeze();
}

/** Releases one owner's lock. Releasing a lock you do not hold does nothing. */
export function unlockScroll(owner: string): void {
  if (!owners.delete(owner)) return;
  if (owners.size === 0) thaw();
}

/**
 * Repairs a page that arrived with a lock nobody owns — a document restored
 * from the back-forward cache after being left with an overlay open, an owner
 * that unmounted without its cleanup running. A page frozen with no way to
 * unfreeze it looks exactly like a site that reopened at the top.
 */
export function repairScrollLock(): void {
  if (owners.size > 0) return;

  const root = document.documentElement;
  const stuck =
    root.classList.contains("is-locked") || document.body.style.position === "fixed";
  if (!stuck) return;

  root.classList.remove("is-locked");
  clearPin();
  if (lockedScrollY > 0) scrollToExact(lockedScrollY);
}

/**
 * @deprecated Kept so nothing outside this repository breaks. Prefer
 * lockScroll/unlockScroll with an owner name: this shim can only guess, and it
 * guesses last-in-first-out.
 */
export function setScrollLocked(locked: boolean): void {
  if (locked) {
    legacyDepth += 1;
    lockScroll(`legacy:${legacyDepth}`);
    return;
  }
  if (legacyDepth === 0) return;
  unlockScroll(`legacy:${legacyDepth}`);
  legacyDepth -= 1;
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
