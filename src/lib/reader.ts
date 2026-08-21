/**
 * reader.ts - the arithmetic of the magnifier, and nothing else.
 *
 * WHAT WAS REMOVED AND WHY. v3 also carried a "fit the whole page into the
 * window" model. At this document's proportions - roughly 704 x 2875 CSS px,
 * about four A4 pages of body text - the honest fit was 0.24, which turns 14px
 * type into 3.4px. Fitting the page and reading the page cannot both be true
 * here, so the page is now drawn at printed size, the window scrolls, and the
 * glass does the close reading. That deleted fitScale, fittedSize, apparentZoom
 * and every custom property that carried a scale.
 *
 * Nothing in this file touches the DOM. The geometry can be proved in node.
 */

/** Magnification against printed size. Below 1.5 a loupe is a smudge. */
export const ZOOM_MIN = 1.5;
export const ZOOM_MAX = 5;
export const ZOOM_STEP = 0.5;

/** What the glass opens at: comfortable reading of 14px type. */
export const ZOOM_REST = 2.5;

/** Diameter of the glass in CSS pixels. Big enough to hold a line of text. */
export const GLASS_DESKTOP = 260;
export const GLASS_MOBILE = 176;

/** How far one arrow key slides the glass. */
export const GLASS_NUDGE = 24;

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/** Kill float noise before it is written into a style string. */
export const round = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** One notch of the wheel or one press of + / -. */
export const stepZoom = (zoom: number, direction: number): number =>
  clamp(round(zoom + direction * ZOOM_STEP), ZOOM_MIN, ZOOM_MAX);

/** A client rect expressed in the coordinates of another client rect. */
export const toBox = (rect: DOMRect, origin: DOMRect): Box => ({
  x: rect.left - origin.left,
  y: rect.top - origin.top,
  w: rect.width,
  h: rect.height,
});

/**
 * How far the clone has to slide so that the point of the page under the centre
 * of the glass is drawn in the centre of the glass.
 *
 * The clone is laid out at the page's own width and scaled by `zoom` about its
 * top-left corner, so a point `d` px into the page is painted at `d * zoom`.
 * We want that to land on `size / 2`:
 *
 *     shift = size / 2 - (centre - edge) * zoom
 *
 * There is no fit factor in this expression any more: the page on the stage is
 * drawn at scale 1. One axis at a time - call it twice.
 *
 * @param centre - centre of the glass, in panel coordinates
 * @param edge   - the page's leading edge on this axis, in panel coordinates
 * @param size   - diameter of the glass
 * @param zoom   - magnification against printed size
 */
export const mirrorShift = (
  centre: number,
  edge: number,
  size: number,
  zoom: number,
): number => round(size / 2 - (centre - edge) * zoom);

/** Is the point inside the box, with an optional tolerance? */
export const inside = (point: Point, box: Box, pad = 0): boolean =>
  point.x >= box.x - pad &&
  point.x <= box.x + box.w + pad &&
  point.y >= box.y - pad &&
  point.y <= box.y + box.h + pad;

/** Hold a point inside a box. Used to keep a dragged glass on the stage. */
export const clampTo = (point: Point, box: Box): Point => ({
  x: clamp(point.x, box.x, box.x + box.w),
  y: clamp(point.y, box.y, box.y + box.h),
});
