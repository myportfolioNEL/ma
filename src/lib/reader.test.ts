import { describe, expect, it } from "vitest";
import {
  GLASS_DESKTOP,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_REST,
  clampTo,
  inside,
  mirrorShift,
  round,
  stepZoom,
} from "./reader";

describe("stepZoom", () => {
  it("moves one notch at a time", () => {
    expect(stepZoom(2.5, 1)).toBe(3);
    expect(stepZoom(2.5, -1)).toBe(2);
  });

  it("cannot leave the range", () => {
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });

  it("opens inside its own range", () => {
    expect(ZOOM_REST).toBeGreaterThanOrEqual(ZOOM_MIN);
    expect(ZOOM_REST).toBeLessThanOrEqual(ZOOM_MAX);
  });
});

describe("mirrorShift", () => {
  /* The property that matters: whatever the numbers, the point of the page
     under the centre of the glass must be drawn at the centre of the glass. */
  const centres = (centre: number, edge: number, zoom: number) => {
    const shift = mirrorShift(centre, edge, GLASS_DESKTOP, zoom);
    return round((centre - edge) * zoom + shift);
  };

  it("puts the point under the glass in the middle of the glass", () => {
    expect(centres(300, 50, 3)).toBe(GLASS_DESKTOP / 2);
    expect(centres(51.5, 50, 1.5)).toBe(GLASS_DESKTOP / 2);
    expect(centres(900, 120, 5)).toBe(GLASS_DESKTOP / 2);
  });

  it("is a plain linear expression", () => {
    expect(mirrorShift(140, 40, 260, 2)).toBe(-70);
  });

  it("does not move when the glass sits on the page's edge at zoom 1", () => {
    expect(mirrorShift(40, 40, 260, 1)).toBe(130);
  });
});

describe("inside", () => {
  const box = { x: 10, y: 10, w: 100, h: 50 };

  it("accepts a point in the box and its edges", () => {
    expect(inside({ x: 60, y: 30 }, box)).toBe(true);
    expect(inside({ x: 10, y: 10 }, box)).toBe(true);
    expect(inside({ x: 110, y: 60 }, box)).toBe(true);
  });

  it("rejects a point outside it", () => {
    expect(inside({ x: 9, y: 30 }, box)).toBe(false);
    expect(inside({ x: 60, y: 61 }, box)).toBe(false);
  });

  it("honours the tolerance", () => {
    expect(inside({ x: 6, y: 30 }, box, 6)).toBe(true);
  });
});

describe("clampTo", () => {
  const box = { x: 0, y: 0, w: 200, h: 100 };

  it("leaves an interior point alone", () => {
    expect(clampTo({ x: 40, y: 40 }, box)).toEqual({ x: 40, y: 40 });
  });

  it("pulls an exterior point back to the edge", () => {
    expect(clampTo({ x: -30, y: 400 }, box)).toEqual({ x: 0, y: 100 });
  });
});

describe("round", () => {
  it("trims the float noise that would otherwise reach the style attribute", () => {
    expect(round(0.1 + 0.2)).toBe(0.3);
    expect(round(130.005, 2)).toBe(130.01);
  });
});
