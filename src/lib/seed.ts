/**
 * seed.ts — deterministic identity for anything that moves.
 *
 * The brief was that every part of the site should move on its own: each
 * image, each window, each block, with nothing sharing a rhythm with its
 * neighbour. The naive way is Math.random(), and it is wrong twice over: the
 * layout would breathe differently on every reload, and any React re-render
 * would hand an element a new personality mid-animation.
 *
 * So personality is derived, not rolled. hash("win-prism") always returns the
 * same number, on every device, in every session. The result is a site where
 * nothing is synchronised and nothing is unstable.
 *
 * No dependencies, no allocation in the hot path, ~40 lines.
 */

/** FNV-1a, 32-bit. Small, fast, and good enough for picking amplitudes. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A stable number in [0, 1) for a seed and a salt. */
export function seededUnit(seed: number, salt = 0): number {
  let value = (seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x2c1b3c6d);
  value ^= value >>> 12;
  value = Math.imul(value, 0x297a2d39);
  value ^= value >>> 15;
  return (value >>> 0) / 4294967296;
}

/** A stable number in [min, max]. */
export function seededRange(
  seed: number,
  min: number,
  max: number,
  salt = 0,
): number {
  return min + seededUnit(seed, salt) * (max - min);
}

/** A stable +1 or -1, so half the pieces lean one way and half the other. */
export function seededSign(seed: number, salt = 0): 1 | -1 {
  return seededUnit(seed, salt) < 0.5 ? -1 : 1;
}

/**
 * The personality of one moving piece.
 *
 * amp   — how far it is willing to be pushed, as a multiplier.
 * lag   — how lazily it follows; higher is heavier and slower to answer.
 * spin  — how much of its travel turns into rotation, and in which direction.
 * swirl — how much sideways curl it adds to a straight push.
 * phase — where it sits in the shared idle cycle, so nothing pulses in unison.
 * squash— how much it deforms (scale/skew) at full local energy.
 */
export type Identity = {
  seed: number;
  amp: number;
  lag: number;
  spin: number;
  swirl: number;
  phase: number;
  squash: number;
};

const cache = new Map<string, Identity>();

/**
 * identityFor("win-momento") → the same Identity every time.
 * Cached because it is called on every mount and the maths, while cheap, is
 * not free when a page has forty moving pieces.
 */
export function identityFor(key: string): Identity {
  const cached = cache.get(key);
  if (cached) return cached;

  const seed = hashString(key);
  const identity: Identity = {
    seed,
    amp: seededRange(seed, 0.72, 1.32, 1),
    lag: seededRange(seed, 0.075, 0.155, 2),
    spin: seededRange(seed, 0.35, 1, 3) * seededSign(seed, 4),
    swirl: seededRange(seed, 0.08, 0.3, 5) * seededSign(seed, 6),
    phase: seededUnit(seed, 7) * Math.PI * 2,
    squash: seededRange(seed, 0.6, 1.25, 8),
  };

  cache.set(key, identity);
  return identity;
}
