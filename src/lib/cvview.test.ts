import { describe, expect, it } from "vitest";
import {
  CV_VIEW_HASH,
  LOUPE_MAX,
  LOUPE_MIN,
  LOUPE_REST,
  LOUPE_STEP,
  docSrc,
  loupeFrame,
  stepZoom,
} from "./cvview";

const pane = { paneW: 600, paneH: 848 };
const size = 200;

describe("loupeFrame", () => {
  it("puts the magnified point in the middle of the box", () => {
    const zoom = 2;
    const x = 300;
    const y = 400;
    const frame = loupeFrame({ x, y, ...pane, size, zoom });

    /* The point of the whole exercise: the pixel under the grip, once the copy
       is scaled and slid, has to land on the centre of the box. */
    expect(frame.tx + x * zoom).toBe(size / 2);
    expect(frame.ty + y * zoom).toBe(size / 2);
  });

  it("centres the box on the point", () => {
    const frame = loupeFrame({ x: 300, y: 400, ...pane, size, zoom: 2 });
    expect(frame.left).toBe(300 - size / 2);
    expect(frame.top).toBe(400 - size / 2);
  });

  it("keeps the box inside the pane at the edges", () => {
    const topLeft = loupeFrame({ x: 0, y: 0, ...pane, size, zoom: 3 });
    expect(topLeft.left).toBe(0);
    expect(topLeft.top).toBe(0);

    const bottomRight = loupeFrame({
      x: pane.paneW,
      y: pane.paneH,
      ...pane,
      size,
      zoom: 3,
    });
    expect(bottomRight.left).toBe(pane.paneW - size);
    expect(bottomRight.top).toBe(pane.paneH - size);
  });

  it("still magnifies the true point when the box has been pushed off the edge", () => {
    /* The box is clamped, the content is not: a corner of the page must still
       be shown magnified even though the box can no longer be centred on it. */
    const zoom = 3;
    const frame = loupeFrame({ x: 4, y: 6, ...pane, size, zoom });
    expect(frame.left).toBe(0);
    expect(frame.tx).toBe(size / 2 - 4 * zoom);
    expect(frame.ty).toBe(size / 2 - 6 * zoom);
  });

  it("survives a pane that has not been measured yet", () => {
    const frame = loupeFrame({
      x: 0,
      y: 0,
      paneW: 0,
      paneH: 0,
      size,
      zoom: LOUPE_REST,
    });
    expect(Number.isFinite(frame.left)).toBe(true);
    expect(Number.isFinite(frame.top)).toBe(true);
    expect(Number.isFinite(frame.tx)).toBe(true);
    expect(Number.isFinite(frame.ty)).toBe(true);
  });
});

describe("stepZoom", () => {
  it("moves by one step", () => {
    expect(stepZoom(LOUPE_REST, 1)).toBeCloseTo(LOUPE_REST + LOUPE_STEP, 5);
    expect(stepZoom(LOUPE_REST, -1)).toBeCloseTo(LOUPE_REST - LOUPE_STEP, 5);
  });

  it("never leaves the range", () => {
    expect(stepZoom(LOUPE_MAX, 1)).toBe(LOUPE_MAX);
    expect(stepZoom(LOUPE_MIN, -1)).toBe(LOUPE_MIN);
  });

  it("has a rest point inside the range", () => {
    expect(LOUPE_REST).toBeGreaterThanOrEqual(LOUPE_MIN);
    expect(LOUPE_REST).toBeLessThanOrEqual(LOUPE_MAX);
  });
});

describe("docSrc", () => {
  it("asks the viewer for a bare page that fits", () => {
    expect(docSrc("blob:https://example.test/abc")).toBe(
      `blob:https://example.test/abc${CV_VIEW_HASH}`,
    );
  });

  it("returns nothing for nothing, so the frame is never mounted on an empty src", () => {
    expect(docSrc("")).toBe("");
  });

  it("does not add the hash twice when the src already carries it", () => {
    const once = docSrc("blob:https://example.test/abc");
    expect(docSrc(once)).toBe(once);
  });
});
