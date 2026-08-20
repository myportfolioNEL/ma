/**
 * useSmoothScroll.ts — kept as a re-export so existing imports keep working.
 *
 * The real implementations now live in:
 *   · lib/scroll.ts            — locks, anchors, the engine registry
 *   · hooks/useScrollDesktop.ts — light Lenis, mouse only
 *   · hooks/useScrollMobile.ts  — native scrolling, phone only
 *
 * Nothing new should import from this file; import from lib/scroll directly.
 */
export {
  setScrollLocked,
  scrollToId,
  scrollToTop,
  remeasureScroll,
} from "../lib/scroll";
