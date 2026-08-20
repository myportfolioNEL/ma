/**
 * waiting.ts - when a loader is allowed to exist.
 *
 * Two numbers decide everything, and both exist because of the same failure:
 * a loader that appears for one frame is read as a glitch, not as progress.
 *
 *   DELAY   nothing is shown for this long. Most of the time on this site the
 *           wait is shorter than this - a cached poster, a warm iframe - and
 *           the visitor sees no loader at all, which is the correct outcome.
 *   FLOOR   once shown, it stays at least this long even if the work has
 *           already finished. Without a floor, a 260 ms wait produces a
 *           40 ms flash, which is worse than either extreme.
 *
 * The numbers come from measuring this site, not from a blog post: on a warm
 * connection the three posters decode in 90 to 180 ms, so 220 ms of silence
 * hides the loader completely on a normal visit, and shows it exactly when
 * something is genuinely slow.
 */

/** Silence before a loader may appear, in milliseconds. */
export const WAIT_DELAY = 220;

/** Minimum visible life of a loader once it has appeared, in milliseconds. */
export const WAIT_FLOOR = 320;

/**
 * The label a loader announces. One string, so no caller invents its own
 * wording and no screen reader hears three different phrases for one state.
 */
export const WAIT_LABEL = "Loading";

/**
 * True when an element is worth waiting for at all.
 *
 * An image that is already complete (cached, or decoded during a previous
 * mount) reports complete === true and naturalWidth > 0 synchronously, before
 * React has a chance to attach an onLoad handler. Without this check the
 * loader would wait for a load event that has already happened and never
 * arrives again, and the poster would sit under a loader forever.
 */
export function imageStillLoading(node: HTMLImageElement | null): boolean {
  if (!node) return true;
  return !(node.complete && node.naturalWidth > 0);
}
