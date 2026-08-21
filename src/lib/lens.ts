import { clamp } from "./utils";

/**
 * lens - where the magnifier is, how big it is, and what the clone underneath it
 * must be moved by.
 *
 * WHY THE LENS HOLDS A CLONE OF THE PAGE AND NOT A SECOND IFRAME. The previous
 * loupe put the same PDF in a second frame and scaled it. That inherited every
 * failure of the first frame, doubled the memory, and forced the page to be
 * unscrollable so the two copies could not disagree. A clone of a DOM node has
 * none of those properties: it is one more subtree in the same document, it
 * scales as vector text at any zoom, and it can be re-aimed every frame from the
 * live position of the original - so the page underneath is free to scroll.
 *
 * WHY THE MATHS LIVES HERE. Two lines of arithmetic decide whether a magnifier
 * tells the truth. They are worth a test that does not need a browser.
 */

/** Smallest and largest magnification, and the step of one press or one wheel notch. */
export const LENS_MIN = 1.5;
export const LENS_MAX = 5;
export const LENS_STEP = 0.5;
/** Where the lens starts: enough to read 7px print, not enough to lose your place. */
export const LENS_REST = 2.5;

/** Lens diameter. Big enough to hold a phrase, small enough to see around. */
export const LENS_SIZE_DESKTOP = 260;
export const LENS_SIZE_MOBILE = 176;

/** The lens never touches the edge of the stage, so it always looks like glass
 *  lying on paper rather than a panel stuck to the frame. */
export const LENS_EDGE = 10;

/** One arrow-key nudge, in CSS pixels. */
export const LENS_NUDGE = 18;

export type Point = { x: number; y: number };
/** A rectangle in panel coordinates: x/y are offsets from the panel's top-left. */
export type Box = { x: number; y: number; w: number; h: number };

/** Three decimals is finer than one device pixel at 5x and keeps the CSS short. */
export const round = (value: number): number => Math.round(value * 1000) / 1000;

/** Client rect -> panel-relative box. Physical coordinates in both directions,
 *  so the same arithmetic serves LTR and RTL without a sign flip. */
export function toBox(
  rect: { left: number; top: number; width: number; height: number },
  origin: { left: number; top: number },
): Box {
  return {
    x: rect.left - origin.left,
    y: rect.top - origin.top,
    w: rect.width,
    h: rect.height,
  };
}

/** One press of + or -, one wheel notch, or one pinch step. */
export function stepZoom(zoom: number, steps: number): number {
  return clamp(round(zoom + steps * LENS_STEP), LENS_MIN, LENS_MAX);
}

/** Keeps the whole lens inside the stage. When the stage is smaller than the
 *  lens - a very short phone in landscape - the lens is centred instead of
 *  fighting two impossible bounds. */
export function clampCentre(point: Point, size: number, stage: Box): Point {
  const half = size / 2 + LENS_EDGE;
  const x =
    stage.w >= half * 2
      ? clamp(point.x, stage.x + half, stage.x + stage.w - half)
      : stage.x + stage.w / 2;
  const y =
    stage.h >= half * 2
      ? clamp(point.y, stage.y + half, stage.y + stage.h - half)
      : stage.y + stage.h / 2;
  return { x: round(x), y: round(y) };
}

/** How far to move the clone so that the point of the page under the lens
 *  centre appears at the centre of the lens.
 *
 *  The clone is painted with `translate3d(tx, ty, 0) scale(z)` and
 *  `transform-origin: 0 0`, so a point p of the page lands at tx + p * z.
 *  Setting that equal to size / 2 gives the two lines below. This is the whole
 *  magnifier. */
export function mirrorShift(
  centre: Point,
  paper: Box,
  size: number,
  zoom: number,
): Point {
  return {
    x: round(size / 2 - (centre.x - paper.x) * zoom),
    y: round(size / 2 - (centre.y - paper.y) * zoom),
  };
}

/** True when the lens centre is over the page. The lens fades out over the
 *  margin instead of showing a slab of paper colour, which is how a real loupe
 *  behaves when you slide it off the sheet. */
export function overPaper(centre: Point, paper: Box): boolean {
  return (
    centre.x >= paper.x &&
    centre.x <= paper.x + paper.w &&
    centre.y >= paper.y &&
    centre.y <= paper.y + paper.h
  );
}
