/**
 * letters.ts — what one letter should look like, as pure arithmetic.
 *
 * Everything here is a function of distance, field and seed. Nothing here
 * touches the DOM, so it can be read top to bottom and trusted; the hook in
 * hooks/useLetterEngine.ts is the only thing allowed to turn these numbers
 * into styles.
 *
 * The behaviour being described:
 *   · a letter leans toward the pointer and lifts slightly as it passes,
 *   · it thickens and narrows — the typeface's own axes, not a fake scale,
 *   · it takes on the accent colour in proportion to how close you are,
 *   · it is also pushed by the liquid field, so a flick of the mouse sends a
 *     wave through the word after the pointer has already left,
 *   · and at rest it is exactly, boringly, perfectly still.
 */

import { seededUnit } from "./seed";

/** The real axis ranges of Bricolage Grotesque, plus the resting values. */
export const AXES = {
  wght: { min: 200, max: 800, rest: 620 },
  wdth: { min: 75, max: 100, rest: 96 },
  opsz: { min: 12, max: 96, rest: 96 },
} as const;

/**
 * Quantisation steps. A letter only re-shapes when its value crosses one of
 * these, which turns a continuous 60fps stream of glyph re-rasterisations into
 * a few discrete ones as the pointer travels.
 */
export const STEP = {
  wght: 25,
  wdth: 1.5,
  opsz: 7,
  tint: 0.06,
  transform: 0.05,
} as const;

/** Radius of influence in CSS pixels: outside this a letter is at rest. */
export const NEAR = 134;

/** How far the pointer must be before the engine is allowed to fall asleep. */
export const SLEEP_DISTANCE = NEAR + 90;

/** Maximum lean toward the pointer, in pixels. */
export const PULL = 8.5;

/** Maximum lift, in pixels. Letters rise toward the pointer, never sink. */
export const LIFT = 12;

/** How much of the liquid field's own displacement a letter accepts. */
export const FIELD_GAIN = 0.5;

export type LetterTarget = {
  x: number;
  y: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  wght: number;
  wdth: number;
  opsz: number;
  /** 0 = ink, 1 = full accent. */
  tint: number;
};

/** The one true resting state. Written verbatim when the engine sleeps. */
export const REST: LetterTarget = {
  x: 0,
  y: 0,
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
  wght: AXES.wght.rest,
  wdth: AXES.wdth.rest,
  opsz: AXES.opsz.rest,
  tint: 0,
};

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Hermite smoothstep. edge0 may be greater than edge1 to invert the ramp. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * 1 when the pointer is on the letter, 0 at NEAR and beyond.
 * The inner edge is 26px rather than 0 so the letter directly under the cursor
 * is not the only one that responds — a word should move like a word.
 */
export function proximity(dx: number, dy: number): number {
  const distance = Math.hypot(dx, dy);
  return smoothstep(NEAR, 26, distance);
}

export type LetterInput = {
  /** Pointer position minus letter centre, in CSS pixels. */
  dx: number;
  dy: number;
  /** The liquid field's displacement at this letter, in CSS pixels. */
  fieldX: number;
  fieldY: number;
  /** Local field energy, 0–1. */
  energy: number;
  /** Stable per-letter seed, so no two letters answer identically. */
  seed: number;
  /** Extra 0–1 amplitude from a travelling wave (mobile tap). */
  wave?: number;
};

/**
 * The whole behaviour of one letter, in one function.
 *
 * Deliberately allocation-free apart from the returned object, which the hook
 * reuses per letter rather than creating each frame.
 */
export function letterTarget(input: LetterInput, out: LetterTarget): LetterTarget {
  const { dx, dy, fieldX, fieldY, energy, seed } = input;
  const wave = input.wave ?? 0;

  /* Personality: two stable numbers in [0,1] per letter. */
  const varianceA = seededUnit(seed, 1);
  const varianceB = seededUnit(seed, 2);

  const near = proximity(dx, dy);
  const force = clamp(near + wave, 0, 1);

  const distance = Math.hypot(dx, dy) || 1;
  const towardX = dx / distance;
  const towardY = dy / distance;

  /* Lean toward the pointer, lift away from it, and take the field's push.
     The 0.75–1.25 spread is what stops the word from moving as one block. */
  const personalAmp = 0.75 + varianceA * 0.5;

  out.x =
    towardX * PULL * force * personalAmp + fieldX * FIELD_GAIN;
  out.y =
    towardY * PULL * 0.45 * force * personalAmp -
    LIFT * force * (0.55 + varianceB * 0.55) +
    fieldY * FIELD_GAIN;

  /* Rotation follows which side of the letter the pointer is on, so the word
     opens around the cursor instead of tilting uniformly. */
  out.rotate = clamp((dx / NEAR) * 7 * force * personalAmp, -9, 9);

  /* A small squash on top of the axis change. The axes do the typographic
     work; this adds the sense of a physical surface being pressed. */
  out.scaleY = 1 + force * 0.12 * personalAmp;
  out.scaleX = 1 - force * 0.045 * personalAmp;

  /* The typeface's own axes. Heavier and narrower under the pointer, and a
     lower optical size, which in this face opens the apertures and spaces the
     forms out — the letter literally becomes a different drawing. */
  out.wght =
    AXES.wght.rest + (AXES.wght.max - AXES.wght.rest) * force * (0.7 + varianceA * 0.3);
  out.wdth = AXES.wdth.rest - (AXES.wdth.rest - 84) * force;
  out.opsz = AXES.opsz.rest - (AXES.opsz.rest - 44) * force * 0.9;

  /* Colour is part of the same gesture, not a separate hover state. Energy
     from the liquid keeps a letter warm for a moment after the pointer has
     gone, which is what makes the field feel like a fluid rather than a map. */
  out.tint = clamp(force * 0.9 + energy * 0.45, 0, 1);

  return out;
}

/** Round to a step. The engine compares rounded values to decide whether to write. */
export function quantise(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Always write all three axes. Omitting one resets it to the font's default,
 * which is the single most common bug in variable-font animation.
 */
export function axisString(wght: number, wdth: number, opsz: number): string {
  return `"wght" ${Math.round(wght)}, "wdth" ${wdth.toFixed(1)}, "opsz" ${Math.round(opsz)}`;
}

/**
 * A travelling pulse used by the phone build: a tap sends one wave outward
 * through the letters instead of tracking a pointer that does not exist.
 *
 * `delta`    — how many letters away this one is from the tapped letter.
 * `front`    — where the wave front currently is, in letters.
 */
export function travellingWave(delta: number, front: number, width = 1.9): number {
  const offset = (Math.abs(delta) - front) / width;
  return Math.exp(-offset * offset);
}
