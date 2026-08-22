import { useEffect } from "react";
import { track } from "../lib/analytics";
import { readFresh, writeFresh } from "../lib/memory";
import { captureSpot, resolveSpot, settled, type Spot } from "../lib/place";

/**
 * useOverlayMemory - a window that scrolls on its own also remembers.
 *
 * Every overlay in this site mounts fresh and unmounts completely: the case
 * study panel, the mobile sheet, the CV reader's stage. React gives a new
 * element every time, so the browser has nothing to restore and each reopen
 * begins at the first line, however far the visitor had read.
 *
 * This hook is the same idea as useScrollMemory, one scope smaller. It keys
 * memory by a string the caller owns - `case:atlas`, `cv:ar` - so two projects
 * and three languages each keep their own reading position, and returning to
 * one does not put you where you were in another.
 *
 * The settle loop matters more here than on the page. An overlay's content is
 * almost always still growing when it mounts: a portrait decodes, a PDF page
 * paints, a font swaps. resolveSpot scales the saved offset by how much the
 * content grew, and the loop keeps applying it until the box stops moving.
 */

export type OverlayMemory = {
  /** Storage key. Include the identity of what is being shown. */
  key: string;
  /** A stable, short name for reports: "case", "sheet", "reader". */
  label: string;
  /** Hold the restore back until the content exists. Defaults to true. */
  ready?: boolean;
};

const TTL_MS = 45 * 60 * 1000;
const IDLE_MS = 260;
const TRIES = 14;
const TOLERANCE = 2;
const FLOOR = 8;

export function useOverlayMemory<T extends HTMLElement>(
  ref: { current: T | null },
  { key, label, ready = true }: OverlayMemory,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || !ready) return;

    const name = `place.${key}`;
    const opened = Date.now();

    let live = true;
    let frame = 0;
    let idle = 0;
    let surrendered = false;

    const remember = (): void => {
      if (!live) return;
      const spot = captureSpot(element);
      if (spot.top <= FLOOR) return;
      writeFresh(name, spot, "session");
    };

    const stored = readFresh<Spot>(name, TTL_MS, "session");
    let restored = 0;

    if (stored && stored.top > FLOOR) {
      let attempt = 0;
      let stable = 0;

      const step = (): void => {
        if (!live || surrendered) return;

        const target = resolveSpot(stored, element);
        if (settled(element.scrollTop, target, TOLERANCE)) {
          stable += 1;
        } else {
          stable = 0;
          element.scrollTop = target;
        }

        restored = target;
        attempt += 1;

        if (stable >= 2 || attempt >= TRIES) return;
        frame = window.requestAnimationFrame(step);
      };

      frame = window.requestAnimationFrame(step);
    }

    /* A hand on the wheel outranks a saved offset, here as everywhere. */
    const surrender = (): void => {
      surrendered = true;
      if (frame !== 0) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const onScroll = (): void => {
      if (idle !== 0) window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        idle = 0;
        remember();
      }, IDLE_MS);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    element.addEventListener("wheel", surrender, { passive: true, once: true });
    element.addEventListener("touchstart", surrender, { passive: true, once: true });

    track("overlay_open", { overlay: label, item: key, resumed: restored > FLOOR, top: restored });

    return () => {
      live = false;
      const spot = captureSpot(element);
      if (spot.top > FLOOR) writeFresh(name, spot, "session");

      if (frame !== 0) window.cancelAnimationFrame(frame);
      if (idle !== 0) window.clearTimeout(idle);
      element.removeEventListener("scroll", onScroll);
      element.removeEventListener("wheel", surrender);
      element.removeEventListener("touchstart", surrender);

      const height = Math.max(1, spot.h - element.clientHeight);
      track("overlay_close", {
        overlay: label,
        item: key,
        dwell_ms: Date.now() - opened,
        depth: Math.round((spot.top / height) * 100),
      });
    };
  }, [ref, key, label, ready]);
}
