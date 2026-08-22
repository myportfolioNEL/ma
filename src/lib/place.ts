/**
 * lib/place.ts - a position on this page, written down so it survives.
 *
 * A raw pixel offset is a bad way to remember where somebody was. Fonts land
 * after first paint and push everything down. The four lower sections are
 * content-visibility:auto, so their height is a guess until the browser walks
 * near them. Rotating the phone rewrites every number on the page. Restore a
 * saved 3184px into any of those and the visitor arrives somewhere they have
 * never been.
 *
 * So a Place stores four things instead of one:
 *
 *   id     the section the visitor was inside - the anchor that means
 *          something to a human: work, numbers, about, capabilities, contact
 *   ratio  how far into that section they were, 0 to 1
 *   y      the pixel offset, kept only as the fallback for "above the first
 *          section" and for measuring drift
 *   h      the document height at the moment of writing, so a page that grew
 *          or shrank can be mapped proportionally
 *
 * Restoring resolves id+ratio against the layout that exists NOW. The visitor
 * lands on the same words, not on the same number - which is what "to the
 * millimetre" actually means once a stylesheet is involved.
 *
 * resolveWith / ratioIn / offsetFrom / scaleY take their layout as arguments
 * and touch no DOM, so the maths is unit tested rather than hoped about.
 */

import { clampRatio } from "./memory";

export type Place = {
  /** Absolute document offset when it was written. */
  y: number;
  /** Anchored section id, or "" when the visitor was above the first one. */
  id: string;
  /** Position inside that section, 0 to 1. */
  ratio: number;
  /** Document height at capture. */
  h: number;
  /** Unix ms. */
  t: number;
};

export type Anchor = { id: string; top: number; height: number };

/* --- pure maths --------------------------------------------------------- */

export function ratioIn(top: number, height: number, y: number): number {
  if (!(height > 0)) return 0;
  return clampRatio((y - top) / height);
}

export function offsetFrom(top: number, height: number, ratio: number): number {
  return top + clampRatio(ratio) * (height > 0 ? height : 0);
}

/** Maps an offset from a document of height `from` onto one of height `to`. */
export function scaleY(y: number, from: number, to: number): number {
  if (!(from > 0) || !(to > 0)) return y;
  return (y * to) / from;
}

/**
 * The offset this Place means in the layout described by the arguments.
 * Rounded to a whole device pixel: a fractional scrollTop is a blurry page.
 */
export function resolveWith(
  place: Place,
  anchor: Anchor | null,
  documentHeight: number,
  viewport: number,
): number {
  const limit = Math.max(0, documentHeight - viewport);
  const raw = anchor
    ? offsetFrom(anchor.top, anchor.height, place.ratio)
    : scaleY(place.y, place.h, documentHeight);
  return Math.round(Math.min(Math.max(raw, 0), limit));
}

/** True when two offsets are the same place for a human. */
export function settled(a: number, b: number, tolerance = 2): boolean {
  return Math.abs(a - b) <= tolerance;
}

/* --- the DOM side ------------------------------------------------------- */

export function documentHeight(): number {
  if (typeof document === "undefined") return 0;
  const root = document.documentElement;
  return Math.max(root.scrollHeight, document.body.scrollHeight, root.clientHeight);
}

export function viewportHeight(): number {
  if (typeof window === "undefined") return 0;
  return window.innerHeight || document.documentElement.clientHeight;
}

export function maxScrollTop(): number {
  return Math.max(0, documentHeight() - viewportHeight());
}

/** Where a section sits in the document right now, or null if it is not laid out. */
export function anchorById(id: string): Anchor | null {
  if (!id || typeof document === "undefined") return null;
  const element = document.getElementById(id);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  /* A zero box is content-visibility skipping the subtree, not an empty
     section. Refuse to anchor to it: the caller will fall back to scale. */
  if (rect.height <= 0) return null;

  return { id, top: rect.top + window.scrollY, height: rect.height };
}

/** The last section that starts at or above `y`. */
export function anchorFor(ids: readonly string[], y: number): Anchor | null {
  let best: Anchor | null = null;
  for (const id of ids) {
    const anchor = anchorById(id);
    if (!anchor) continue;
    if (anchor.top > y + 1) continue;
    if (!best || anchor.top > best.top) best = anchor;
  }
  return best;
}

export function capturePlace(ids: readonly string[], y: number): Place {
  const anchor = anchorFor(ids, y);
  return {
    y: Math.round(y),
    id: anchor ? anchor.id : "",
    ratio: anchor ? ratioIn(anchor.top, anchor.height, y) : 0,
    h: Math.round(documentHeight()),
    t: Date.now(),
  };
}

/** The offset this Place means in the layout on screen at this instant. */
export function resolvePlace(place: Place): number {
  return resolveWith(
    place,
    place.id ? anchorById(place.id) : null,
    documentHeight(),
    viewportHeight(),
  );
}

/** How far down the page an offset is, as a percentage. For analytics. */
export function depthPercent(y: number): number {
  const height = documentHeight();
  if (!(height > 0)) return 0;
  const seen = Math.min(y + viewportHeight(), height);
  return Math.round((seen / height) * 100);
}

/* --- the same idea, for a box that scrolls on its own ------------------- */

export type Spot = { top: number; h: number };

export function captureSpot(element: HTMLElement): Spot {
  return { top: Math.round(element.scrollTop), h: Math.round(element.scrollHeight) };
}

/**
 * A window's content can arrive late - a PDF page renders, an image sizes - so
 * the saved offset is scaled by how much the content grew since it was written.
 */
export function resolveSpot(spot: Spot, element: HTMLElement): number {
  const height = element.scrollHeight;
  const limit = Math.max(0, height - element.clientHeight);
  const raw = spot.h > 0 ? scaleY(spot.top, spot.h, height) : spot.top;
  return Math.round(Math.min(Math.max(raw, 0), limit));
}
