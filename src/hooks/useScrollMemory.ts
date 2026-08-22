import { useEffect } from "react";
import { track } from "../lib/analytics";
import { evictOldVersions, readFresh, writeFresh } from "../lib/memory";
import {
  capturePlace,
  depthPercent,
  resolvePlace,
  settled,
  type Place,
} from "../lib/place";
import {
  currentScrollY,
  isScrollLocked,
  lockedScrollTop,
  repairScrollLock,
  scrollToExact,
} from "../lib/scroll";

/**
 * useScrollMemory - the page remembers where you were, and puts you back.
 *
 * WHY THE SITE USED TO ALWAYS OPEN AT THE TOP. Both scroll hooks set
 * `history.scrollRestoration = "manual"`, which switches off the browser's own
 * restore, and nothing in the repository ever replaced it: there was not one
 * write of a scroll offset anywhere in src/. So every return - the back button
 * after an outbound link, a reload, a phone that dropped the tab, a PDF opened
 * in another tab and closed again - landed at zero, and the preloader played
 * its whole introduction again as if the visitor had never been here.
 *
 * WHY RESTORING IS NOT ONE LINE. The page is not the same height it was when
 * the offset was written: fonts land after first paint, the four lower
 * sections are content-visibility:auto and have no real height until the
 * browser walks near them, and images size themselves late. A single
 * scrollTo(y) at mount lands in the wrong place, and worse, lands in a place
 * that then moves under the visitor.
 *
 * So restoring is a settle loop:
 *
 *   1. Wait while the preloader owns the screen. html.is-loading sets
 *      overflow:hidden - a scroll written during that period is thrown away by
 *      the browser, silently.
 *   2. Resolve the Place against the layout as it exists this frame.
 *   3. Jump. Let the browser lay out. Resolve again.
 *   4. Stop when the answer has not moved for two consecutive frames, or after
 *      TRIES attempts, whichever comes first.
 *
 * And it surrenders instantly. The moment the visitor touches the wheel, the
 * screen or an arrow key, the loop abandons: nothing on this site is allowed
 * to fight a human for the scrollbar.
 */

/** One session's worth of memory. A stale offset is worse than none. */
const TTL_MS = 45 * 60 * 1000;

const KEY = "place.page";

/** Below this the visitor is at the top, and there is nothing to restore. */
const FLOOR = 24;

/** Quiet time before an offset is written. */
const IDLE_MS = 300;

/** Settle attempts once the page is actually scrollable. */
const TRIES = 16;

/** Frames the loop is willing to spend waiting for the preloader. */
const WAIT_FRAMES = 300;

const TOLERANCE = 2;

export function useScrollMemory(sections: readonly string[]): void {
  useEffect(() => {
    evictOldVersions();

    let live = true;
    let surrendered = false;
    let frame = 0;
    let idle = 0;

    /* --- writing ------------------------------------------------------- */

    /* While an overlay holds the lock the document is pinned and window.scrollY
       reads zero on the phone. The true offset is the one the lock is holding. */
    const remember = (final = false): void => {
      const y = isScrollLocked() ? lockedScrollTop() : currentScrollY();
      if (!Number.isFinite(y) || y < 0) return;

      const place = capturePlace(sections, y);
      writeFresh(KEY, place, "session");

      if (final) {
        track(
          "place_saved",
          {
            y: place.y,
            section: place.id,
            ratio: Math.round(place.ratio * 100) / 100,
            depth: depthPercent(place.y),
          },
          true,
        );
      }
    };

    /* --- reading ------------------------------------------------------- */

    const busy = (): boolean => {
      const root = document.documentElement;
      return root.classList.contains("is-loading") || root.classList.contains("is-locked");
    };

    const restore = (place: Place, reason: string): void => {
      let attempt = 0;
      let waited = 0;
      let stable = 0;

      const step = (): void => {
        if (!live || surrendered) return;

        if (busy()) {
          waited += 1;
          if (waited > WAIT_FRAMES) return;
          frame = window.requestAnimationFrame(step);
          return;
        }

        const target = resolvePlace(place);
        const y = currentScrollY();

        if (settled(y, target, TOLERANCE)) {
          stable += 1;
        } else {
          stable = 0;
          scrollToExact(target);
        }

        attempt += 1;

        if (stable >= 2 || attempt >= TRIES) {
          track("scroll_restore", {
            y: target,
            section: place.id,
            depth: depthPercent(target),
            tries: attempt,
            drift: Math.round(Math.abs(currentScrollY() - target)),
            reason,
          });
          return;
        }

        frame = window.requestAnimationFrame(step);
      };

      frame = window.requestAnimationFrame(step);
    };

    const stored = readFresh<Place>(KEY, TTL_MS, "session");
    const anchored = window.location.hash.length > 1;
    const worth = stored !== null && stored.y > FLOOR;

    if (worth && !anchored && currentScrollY() <= FLOOR) {
      restore(stored, "mount");

      /* Fonts change every height on the page. One more pass after they land. */
      if (document.fonts?.ready) {
        void document.fonts.ready.then(() => {
          if (live && !surrendered) restore(stored, "fonts");
        });
      }
    }

    /* --- the visitor always wins --------------------------------------- */

    const surrender = (): void => {
      surrendered = true;
      if (frame !== 0) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const onKey = (event: KeyboardEvent): void => {
      const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
      if (keys.includes(event.key)) surrender();
    };

    window.addEventListener("wheel", surrender, { passive: true, once: true });
    window.addEventListener("touchstart", surrender, { passive: true, once: true });
    window.addEventListener("keydown", onKey);

    /* --- when to write -------------------------------------------------- */

    const onScroll = (): void => {
      if (idle !== 0) window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        idle = 0;
        remember();
      }, IDLE_MS);
    };

    const onHide = (): void => remember(true);

    const onVisibility = (): void => {
      if (document.visibilityState === "hidden") remember(true);
    };

    /* Capture phase: a link that replaces the document gives no other warning. */
    const onClick = (): void => remember();

    /**
     * Back-forward cache. The page comes back exactly as it was left - which is
     * a problem when it was left with an overlay open, because html.is-locked
     * and the pinned body come back too, and the site returns frozen at the
     * top. Release the locks, then put the visitor back.
     */
    const onShow = (event: PageTransitionEvent): void => {
      if (!event.persisted) return;
      repairScrollLock();
      surrendered = false;

      const saved = readFresh<Place>(KEY, TTL_MS, "session");
      if (saved && saved.y > FLOOR && currentScrollY() <= FLOOR) restore(saved, "bfcache");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onClick, true);

    return () => {
      live = false;
      remember();
      if (frame !== 0) window.cancelAnimationFrame(frame);
      if (idle !== 0) window.clearTimeout(idle);
      window.removeEventListener("wheel", surrender);
      window.removeEventListener("touchstart", surrender);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onClick, true);
    };
  }, [sections]);
}
