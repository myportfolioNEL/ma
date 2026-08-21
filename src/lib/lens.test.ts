import { describe, expect, it } from "vitest";
import {
  LENS_EDGE,
  LENS_MAX,
  LENS_MIN,
  LENS_REST,
  clampCentre,
  mirrorShift,
  overPaper,
  stepZoom,
  toBox,
} from "./lens";

const stage = { x: 0, y: 0, w: 800, h: 600 };
const paper = { x: 100, y: 50, w: 600, h: 900 };

describe("stepZoom", () => {
  it("starts at rest inside the range", () => {
    expect(LENS_REST).toBeGreaterThanOrEqual(LENS_MIN);
    expect(LENS_REST).toBeLessThanOrEqual(LENS_MAX);
  });

  it("never leaves the range", () => {
    expect(stepZoom(LENS_MAX, 4)).toBe(LENS_MAX);
    expect(stepZoom(LENS_MIN, -4)).toBe(LENS_MIN);
  });

  it("moves one step at a time in both directions", () => {
    expect(stepZoom(2, 1)).toBe(2.5);
    expect(stepZoom(2, -1)).toBe(1.5);
  });
});

describe("clampCentre", () => {
  it("keeps the lens inside the stage", () => {
    const centre = clampCentre({ x: -400, y: -400 }, 200, stage);
    expect(centre.x).toBe(100 + LENS_EDGE);
    expect(centre.y).toBe(100 + LENS_EDGE);
  });

  it("centres the lens when the stage is smaller than the lens", () => {
    const centre = clampCentre({ x: 0, y: 0 }, 400, { x: 0, y: 0, w: 200, h: 200 });
    expect(centre).toEqual({ x: 100, y: 100 });
  });
});

describe("mirrorShift", () => {
  it("puts the point under the lens centre at the centre of the lens", () => {
    const size = 200;
    const zoom = 2;
    const centre = { x: 300, y: 400 };
    const shift = mirrorShift(centre, paper, size, zoom);
    /* The page point under the centre, mapped through the same transform the
       stylesheet applies, must land exactly on the middle of the lens. */
    expect(shift.x + (centre.x - paper.x) * zoom).toBe(size / 2);
    expect(shift.y + (centre.y - paper.y) * zoom).toBe(size / 2);
  });

  it("moves twice as far when the magnification doubles", () => {
    const a = mirrorShift({ x: 300, y: 400 }, paper, 200, 2);
    const b = mirrorShift({ x: 300, y: 400 }, paper, 200, 4);
    expect(100 - b.x).toBe((100 - a.x) * 2);
  });
});

describe("overPaper", () => {
  it("knows the page from the margin", () => {
    expect(overPaper({ x: 300, y: 400 }, paper)).toBe(true);
    expect(overPaper({ x: 20, y: 400 }, paper)).toBe(false);
  });
});

describe("toBox", () => {
  it("expresses a client rect in panel coordinates", () => {
    const box = toBox(
      { left: 140, top: 220, width: 600, height: 900 },
      { left: 40, top: 20 },
    );
    expect(box).toEqual({ x: 100, y: 200, w: 600, h: 900 });
  });
});
