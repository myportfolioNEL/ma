import { describe, expect, it } from "vitest";
import {
  clampRatio,
  crossedDepths,
  DEPTHS,
  isFresh,
  memoryKey,
  MEMORY_VERSION,
} from "./memory";
import {
  offsetFrom,
  ratioIn,
  resolveWith,
  scaleY,
  settled,
  type Place,
} from "./place";

/**
 * The arithmetic of remembering a place, tested where it can be tested.
 *
 * vitest runs in the node environment here (vitest.config.ts), so nothing in
 * this file may touch window, document or storage. That constraint is the
 * reason memory.ts and place.ts keep their pure helpers separate from their
 * DOM helpers: this is the half that can be proven, and it is the half that
 * decides whether a visitor lands on the line they left.
 */

const place = (over: Partial<Place> = {}): Place => ({
  y: 4000,
  id: "about",
  ratio: 0.5,
  h: 10000,
  t: Date.now(),
  ...over,
});

describe("memoryKey", () => {
  it("namespaces and versions every key", () => {
    expect(memoryKey("place.page")).toBe(`nl.mem.${MEMORY_VERSION}.place.page`);
  });

  it("never collides with the keys other files already own", () => {
    /* lib/quality.ts owns nl.quality, LocaleContext owns portfolio-locale.
       evictOldVersions() sweeps by this prefix, so the prefix must not match
       either of them. */
    expect(memoryKey("quality").startsWith("nl.mem.")).toBe(true);
    expect(memoryKey("quality")).not.toBe("nl.quality");
    expect(memoryKey("locale")).not.toBe("portfolio-locale");
  });
});

describe("isFresh", () => {
  const now = 1_700_000_000_000;

  it("accepts a stamp inside the window", () => {
    expect(isFresh(now - 1000, 5000, now)).toBe(true);
  });

  it("rejects a stamp outside it", () => {
    expect(isFresh(now - 6000, 5000, now)).toBe(false);
  });

  it("rejects nonsense rather than trusting it", () => {
    expect(isFresh(0, 5000, now)).toBe(false);
    expect(isFresh(Number.NaN, 5000, now)).toBe(false);
  });

  it("survives a clock that moved backwards", () => {
    /* A phone that syncs its time mid-session must not be able to make a
       ten-second-old offset look like a stamp from the future and pass. */
    expect(isFresh(now + 60_000, 5000, now)).toBe(false);
    expect(isFresh(now + 1000, 5000, now)).toBe(true);
  });
});

describe("clampRatio", () => {
  it("keeps a ratio inside its own definition", () => {
    expect(clampRatio(0.5)).toBe(0.5);
    expect(clampRatio(-3)).toBe(0);
    expect(clampRatio(9)).toBe(1);
    expect(clampRatio(Number.NaN)).toBe(0);
    expect(clampRatio(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("crossedDepths", () => {
  it("reports each mark once, in order", () => {
    expect(crossedDepths(0, 60)).toEqual([10, 25, 50]);
    expect(crossedDepths(60, 95)).toEqual([75, 90]);
  });

  it("reports nothing when the visitor scrolls back up", () => {
    expect(crossedDepths(80, 20)).toEqual([]);
    expect(crossedDepths(50, 50)).toEqual([]);
  });

  it("reaches the bottom exactly once", () => {
    expect(crossedDepths(95, 100)).toEqual([100]);
    expect(crossedDepths(100, 100)).toEqual([]);
  });

  it("covers every mark across a whole page", () => {
    expect(crossedDepths(0, 100)).toEqual([...DEPTHS]);
  });
});

describe("ratioIn / offsetFrom", () => {
  it("round-trips a position inside a section", () => {
    const ratio = ratioIn(2000, 800, 2400);
    expect(ratio).toBeCloseTo(0.5, 10);
    expect(offsetFrom(2000, 800, ratio)).toBeCloseTo(2400, 10);
  });

  it("refuses to divide by a section that has no height yet", () => {
    /* content-visibility:auto sections really do report zero before the
       browser walks near them. */
    expect(ratioIn(2000, 0, 2400)).toBe(0);
    expect(offsetFrom(2000, 0, 0.5)).toBe(2000);
  });

  it("clamps a position that fell outside its section", () => {
    expect(ratioIn(2000, 800, 9000)).toBe(1);
    expect(ratioIn(2000, 800, 100)).toBe(0);
  });
});

describe("scaleY", () => {
  it("maps an offset onto a page that grew", () => {
    expect(scaleY(1000, 5000, 10000)).toBe(2000);
  });

  it("maps an offset onto a page that shrank", () => {
    expect(scaleY(2000, 10000, 5000)).toBe(1000);
  });

  it("returns the offset untouched when either height is unknown", () => {
    expect(scaleY(1234, 0, 10000)).toBe(1234);
    expect(scaleY(1234, 10000, 0)).toBe(1234);
  });
});

describe("resolveWith", () => {
  it("prefers the anchor: a section that moved takes its reader with it", () => {
    /* The saved offset was 4000 in a 10000px document. The section it was
       anchored to now starts at 6000 - fonts landed, an image sized itself -
       so the correct answer is 6000 + 0.5 x 1000, not 4000. */
    const y = resolveWith(place(), { id: "about", top: 6000, height: 1000 }, 14000, 900);
    expect(y).toBe(6500);
  });

  it("falls back to proportional scaling when the anchor is gone", () => {
    const y = resolveWith(place(), null, 20000, 900);
    expect(y).toBe(8000);
  });

  it("never asks for an offset the document cannot reach", () => {
    const y = resolveWith(place({ y: 9800 }), null, 3000, 900);
    expect(y).toBe(2100);
    expect(y).toBeLessThanOrEqual(3000 - 900);
  });

  it("never returns a negative offset or a fraction of a pixel", () => {
    const y = resolveWith(place({ y: -50, h: 0 }), null, 4000, 900);
    expect(y).toBe(0);
    expect(Number.isInteger(resolveWith(place({ y: 1333 }), null, 7777, 901))).toBe(true);
  });
});

describe("settled", () => {
  it("treats a pixel or two of drift as the same place", () => {
    expect(settled(1000, 1001)).toBe(true);
    expect(settled(1000, 1002)).toBe(true);
    expect(settled(1000, 1004)).toBe(false);
    expect(settled(1000, 1004, 6)).toBe(true);
  });
});
