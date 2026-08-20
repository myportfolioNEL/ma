import {
  attachLiquid,
  liquidEnergy,
  pulseLiquid,
  subscribeLiquid,
  type LiquidTick,
} from "./liquid";
import { pointerState } from "./pointer";
import { prefersReducedMotion } from "./motion";

/**
 * lib/energy.ts — "how disturbed is the surface, right here, right now?"
 *
 * The brief for this round was that a button should not merely have a hover
 * state; it should belong to the same disturbance as the rest of the page —
 * its colour and its shape should change because the field under it moved.
 *
 * The naive way to do that is to give every button a pointer listener and a
 * frame loop. Twelve buttons then means twelve loops, twelve layout reads and
 * twelve sets of state that never sleep. This module is the opposite of that:
 *
 *   · ONE subscription to the shared clock, no matter how many elements are
 *     registered. It is created with the first registration and destroyed
 *     with the last, so a page with no buttons on screen has no loop at all.
 *   · Layout is read at registration, on a debounced resize, and after the
 *     webfont lands — never inside the tick.
 *   · Positions are stored in document space, so scrolling costs one read of
 *     window.scrollY per frame in total, not one rect per element per frame.
 *   · Each element gets --e quantised to a step (0.05 by default). A repaint
 *     is only triggered when the rounded value actually changes, which in
 *     practice is a handful of times per second for the one or two elements
 *     nearest the pointer, and never for the rest.
 *   · The clock stops on its own when the field settles, so "at rest" here
 *     literally means zero work rather than a loop writing zeroes.
 *
 * What reads --e: the button borders, radii and tints in desktop.css and
 * mobile.css, and the section-heading rules. Nothing in JavaScript reads it
 * back; this is a one-way channel from the field to CSS.
 */

type Entry = {
  el: HTMLElement;
  /** Pixels beyond the element's box where the field still reaches it. */
  radius: number;
  /** Quantisation step for --e. */
  step: number;
  /** Document-space box, refreshed only on measure(). */
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  /** Last value actually written to the DOM. */
  written: number;
  /** Local, decaying boost added by hover/press. 0–1. */
  bump: number;
  /** Skipped entirely while offscreen. */
  visible: boolean;
};

const entries = new Map<HTMLElement, Entry>();

let stopTick: (() => void) | null = null;
let detachField: (() => void) | null = null;
let observer: IntersectionObserver | null = null;
let resizeTimer = 0;
let lastWake = 0;

/** Below this the field is considered still and every element is written to 0. */
const QUIET = 0.006;

/** How fast a local hover/press boost fades, per second. */
const BUMP_DECAY = 2.1;

/** Minimum gap between two field wakes caused by hover, in milliseconds. */
const WAKE_COOLDOWN = 520;

function measure(entry: Entry): void {
  const rect = entry.el.getBoundingClientRect();
  entry.hw = rect.width / 2;
  entry.hh = rect.height / 2;
  entry.cx = rect.left + entry.hw + window.scrollX;
  entry.cy = rect.top + entry.hh + window.scrollY;
}

/** Re-measures every registered element. Batched: all reads, then nothing. */
export function measureEnergyTargets(): void {
  entries.forEach(measure);
}

function scheduleMeasure(): void {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(measureEnergyTargets, 160);
}

function write(entry: Entry, value: number): void {
  const stepped = Math.round(value / entry.step) * entry.step;
  if (stepped === entry.written) return;
  entry.written = stepped;
  if (stepped === 0) {
    entry.el.style.removeProperty("--e");
    return;
  }
  entry.el.style.setProperty("--e", stepped.toFixed(2));
}

function tick(t: LiquidTick): void {
  const global = liquidEnergy();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const px = pointerState.x + scrollX;
  const py = pointerState.y + scrollY;
  const hasPointer = pointerState.present;

  /* dt is seconds; lib/liquid guarantees it is clamped to a sane range. */
  const decay = Math.max(0, 1 - BUMP_DECAY * t.dt);

  entries.forEach((entry) => {
    if (entry.bump > 0) {
      entry.bump = entry.bump < 0.002 ? 0 : entry.bump * decay;
    }

    if (!entry.visible) {
      if (entry.written !== 0) write(entry, 0);
      return;
    }

    let local = 0;

    if (hasPointer && global > QUIET) {
      /* Distance from the pointer to the element's box, not to its centre:
         a wide button should light up along its whole length. */
      const dx = Math.max(0, Math.abs(px - entry.cx) - entry.hw);
      const dy = Math.max(0, Math.abs(py - entry.cy) - entry.hh);
      const distance = Math.hypot(dx, dy);

      if (distance < entry.radius) {
        /* Smooth falloff. Squared so the near field is felt and the far
           field is not a permanent low hum. */
        const near = 1 - distance / entry.radius;
        local = global * near * near;
      }
    }

    if (entry.bump > local) local = entry.bump;

    write(entry, local > 1 ? 1 : local);
  });
}

function ensureLoop(): void {
  if (stopTick) return;
  detachField = attachLiquid();
  stopTick = subscribeLiquid(tick);

  observer = new IntersectionObserver(
    (records) => {
      records.forEach((record) => {
        const entry = entries.get(record.target as HTMLElement);
        if (!entry) return;
        entry.visible = record.isIntersecting;
        if (entry.visible) measure(entry);
      });
    },
    { rootMargin: "15% 0px" },
  );

  entries.forEach((entry) => observer?.observe(entry.el));

  window.addEventListener("resize", scheduleMeasure, { passive: true });
  if (document.fonts?.ready) void document.fonts.ready.then(measureEnergyTargets);
}

function teardownLoop(): void {
  if (entries.size > 0) return;
  stopTick?.();
  stopTick = null;
  detachField?.();
  detachField = null;
  observer?.disconnect();
  observer = null;
  window.removeEventListener("resize", scheduleMeasure);
  window.clearTimeout(resizeTimer);
}

export type EnergyOptions = {
  /** Pixels around the element's box that still count as "near". */
  radius?: number;
  /** Quantisation step for --e. Larger = fewer repaints. */
  step?: number;
};

/**
 * Registers an element to receive --e. Returns the unregister function; call
 * it in the effect cleanup. Registering under reduced motion is a no-op that
 * still returns a valid cleanup, so callers need no branch.
 */
export function registerEnergy(
  el: HTMLElement,
  options: EnergyOptions = {},
): () => void {
  if (prefersReducedMotion()) return () => {};

  const entry: Entry = {
    el,
    /* 210 كانت توقِظ عناصر بعيدة عن المؤشّر بـ 210 بكسل في كل اتجاه. */
    radius: options.radius ?? 160,
    /* عشر درجات بدل عشرين: نصف عدد عمليات إعادة الحساب، ولا فرق مرئي. */
    step: options.step ?? 0.1,
    cx: 0,
    cy: 0,
    hw: 0,
    hh: 0,
    written: 0,
    bump: 0,
    visible: true,
  };

  measure(entry);
  entries.set(el, entry);
  ensureLoop();
  observer?.observe(el);

  return () => {
    observer?.unobserve(el);
    entries.delete(el);
    el.style.removeProperty("--e");
    teardownLoop();
  };
}

/**
 * Gives one element an immediate local boost, and — at most a couple of times
 * a second — nudges the real field so the boost is not a lie: the surface
 * under the element actually moves too.
 *
 * This is what a hover or a press calls. It is deliberately not a listener
 * inside this module: the element knows when it was touched, and asking it to
 * tell us is cheaper than watching every element for us to find out.
 */
export function bumpEnergy(el: HTMLElement, amount = 0.65, wake = true): void {
  const entry = entries.get(el);
  if (!entry) return;
  if (amount > entry.bump) entry.bump = amount > 1 ? 1 : amount;

  if (!wake) return;
  const now = performance.now();
  if (now - lastWake < WAKE_COOLDOWN) return;
  lastWake = now;

  /* Push the field at the element's centre, converted back to viewport
     space. The clock is asleep when the page is idle, and this is what wakes
     it — without it, a hover on a still page would change nothing. */
  pulseLiquid(
    entry.cx - window.scrollX,
    entry.cy - window.scrollY,
    0.42 * amount,
  );
}
