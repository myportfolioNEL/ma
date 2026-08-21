import { clamp } from "./utils";

/**
 * cvview.ts - policy for reading the CV in place, and the geometry of the
 * magnifier.
 *
 * Everything here is either a number chosen once, or a pure function of its
 * arguments. There is no DOM at module scope, so cvview.test.ts runs under
 * vitest's node environment like every other test in this repository.
 *
 * WHY THE PAGE IS OPENED FIT-TO-PAGE, AND WHY THAT IS NOT COSMETIC.
 * The magnifier is a second copy of the same document, scaled. Nothing can read
 * the scroll offset of a PDF viewer's document, so if the first copy could
 * scroll inside its frame the second copy would be showing a different part of
 * the page and the loupe would lie. Fit-to-page inside an A4-shaped pane means
 * the whole page is on screen and there is no internal scroll to desynchronise.
 * The panel scrolls. The document does not.
 */

/** How long a frame may take to prove it rendered before the fallback appears. */
export const CV_VIEW_TIMEOUT = 7000;

/** How long the magnified copy stays in the DOM after the box is dismissed. */
export const CV_VIEW_LINGER = 700;

export const LOUPE_MIN = 1.5;
export const LOUPE_MAX = 4.5;
export const LOUPE_STEP = 0.5;
export const LOUPE_REST = 2.5;

/** The side of the zoom box, in CSS pixels. A thumb needs a smaller one. */
export const LOUPE_SIZE_DESKTOP = 264;
export const LOUPE_SIZE_MOBILE = 184;

/**
 * The viewer hash.
 *
 * Chrome reads view/toolbar/navpanes/scrollbar/statusbar. Firefox's built-in
 * pdf.js reads zoom=page-fit. Each engine ignores what it does not know, so
 * asking both in one string is cheaper than sniffing the engine - and an engine
 * that ignores all of them still shows the page, which is the only thing that
 * actually matters.
 */
export const CV_VIEW_HASH =
  "#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&view=Fit&zoom=page-fit";

/** The src both copies of the document receive. Identical, hash included. */
export function docSrc(url: string): string {
  if (url === "") return "";
  /* Idempotent on purpose: the same src is rendered into two frames and
     re-rendered on every language change, so appending the hash twice has
     to be impossible rather than merely unlikely. */
  return url.includes("#") ? url : `${url}${CV_VIEW_HASH}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export type LoupeFrame = {
  /** Offset of the zoom box inside the pane, physical pixels. */
  left: number;
  top: number;
  /** Offset of the magnified copy inside the zoom box. */
  tx: number;
  ty: number;
};

/**
 * Where the box goes, and where the magnified copy goes inside it.
 *
 * The box is centred on the point being magnified, then clamped so it can never
 * hang outside the pane. The copy is a child of the box, scaled from its own
 * top-left corner, so the offset that puts the point (x, y) under the centre of
 * the box is measured from the box and not from the pane:
 *
 *     x * zoom + tx = size / 2   ->   tx = size / 2 - x * zoom
 *
 * When the box is clamped against an edge, the point stays at the centre of the
 * box while the box itself stops moving - which is how every loupe that feels
 * right behaves.
 *
 * THE MATHS IS PHYSICAL, NOT LOGICAL, ON PURPOSE. left/top and clientX/clientY
 * are physical in both writing directions, so the Arabic build needs no special
 * case here and gets none.
 */
export function loupeFrame(input: {
  x: number;
  y: number;
  paneW: number;
  paneH: number;
  size: number;
  zoom: number;
}): LoupeFrame {
  const { paneW, paneH, size, zoom } = input;
  const x = clamp(input.x, 0, paneW);
  const y = clamp(input.y, 0, paneH);
  const half = size / 2;

  return {
    left: round(clamp(x - half, 0, Math.max(0, paneW - size))),
    top: round(clamp(y - half, 0, Math.max(0, paneH - size))),
    tx: round(half - x * zoom),
    ty: round(half - y * zoom),
  };
}

/** One notch of magnification, clamped. direction is +1 or -1. */
export function stepZoom(current: number, direction: number): number {
  const next = current + Math.sign(direction) * LOUPE_STEP;
  return clamp(round(next), LOUPE_MIN, LOUPE_MAX);
}

/**
 * Whether this device is offered the magnifier at all.
 *
 * The zoom box is a second browsing context holding a second copy of the same
 * document. That is affordable on a machine that passed the frame-budget sample
 * in lib/quality.ts and has memory to spare, and it is not affordable on one
 * that did not. A device that fails this test is not shown a grip it would
 * regret pressing - it still reads the CV, which is the feature.
 *
 * The DOM is touched inside the function and never at module scope, so this
 * file stays importable from a node test.
 */
export function canLoupe(): boolean {
  if (typeof document === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  if (document.documentElement.dataset.quality === "low") return false;

  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  if (typeof memory === "number" && memory > 0 && memory < 4) return false;

  return true;
}
