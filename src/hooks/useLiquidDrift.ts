import { useEffect, useRef } from "react";
import {
  attachLiquid,
  sampleLiquid,
  subscribeLiquid,
  type LiquidSample,
  type LiquidTick,
} from "../lib/liquid";
import { gsap, prefersReducedMotion } from "../lib/motion";
import { identityFor } from "../lib/seed";

/**
 * useLiquidDrift — one DOM element behaving like a body floating in the field.
 *
 * The brief said everything should move on its own: each image, each window,
 * each block, none of them sharing a rhythm. That is what `id` is for. Two
 * pieces given different ids get different amplitudes, different lag,
 * different rotation directions and different curl, permanently and
 * deterministically — see lib/seed.ts.
 *
 * What this hook is allowed to write on its element:
 *   transform (x, y, rotate, scaleX, scaleY, skewX) and the custom property
 *   --e, which is the local field energy, quantised.
 *
 * What it must never share the element with: a reveal tween, a CSS transition
 * on transform, or another instance of this hook. One owner per transform.
 *
 * Cost control, in order of importance:
 *   1. The shared clock stops when the field is at rest, so an untouched page
 *      runs no JavaScript at all.
 *   2. Offscreen elements are skipped by an IntersectionObserver and by a
 *      viewport cull, so scrolling past forty pieces costs nothing for the
 *      thirty-eight that are not visible.
 *   3. Every write is compared against the last written value first.
 *   4. On reaching rest the element is written to exact zero once, and
 *      will-change is removed so the compositor can drop the layer.
 */

type Options = {
  /** Multiplier on how far the field can push this piece. */
  strength?: number;
  /** How much of the travel becomes rotation, in degrees per pixel. */
  rotate?: number;
  /** 0–1 follow factor; lower is lazier. Defaults to the piece's own lag. */
  ease?: number;
  enabled?: boolean;
  /**
   * Identity key. Give every piece a stable, distinct one — "win-prism",
   * "art-momento", "hero-name". Same key, same personality, every reload.
   */
  id?: string;
  /** Multiplier on the sideways curl this piece adds to a straight push. */
  swirl?: number;
  /** Multiplier on deformation: scale and skew at high local energy. */
  squash?: number;
  /** Publish local energy as --e on the element, for CSS to read. */
  energyVar?: boolean;
  /** Pixels beyond the viewport before the piece stops being updated. */
  cull?: number;
};

/** Local energy is written in steps this size, never continuously. */
const ENERGY_STEP = 0.05;

/** Frames at rest before the piece writes its exact resting state and idles. */
const SLEEP_FRAMES = 18;

export function useLiquidDrift<T extends HTMLElement>(options: Options = {}) {
  const {
    strength = 1,
    rotate = 0,
    ease,
    enabled = true,
    id,
    swirl = 1,
    squash = 0,
    energyVar = false,
    cull = 220,
  } = options;

  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (prefersReducedMotion()) return;

    const element = ref.current;
    if (!element) return;

    const identity = identityFor(
      id ?? `${element.tagName}:${element.className || "anonymous"}`,
    );

    /* Keeps the shared field alive for as long as this piece needs it. */
    const release = attachLiquid();

    /* ---- measurement: batched, never during a write ---------------------- */
    let centreX = 0;
    let centreY = 0;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      centreX = rect.left + rect.width / 2 + window.scrollX;
      centreY = rect.top + rect.height / 2 + window.scrollY;
    };

    measure();

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 150);
    };
    window.addEventListener("resize", onResize, { passive: true });

    /* ---- visibility gate -------------------------------------------------- */
    let visible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) measure();
      },
      { rootMargin: "12% 0px" },
    );
    observer.observe(element);

    /* ---- writers ---------------------------------------------------------- */
    const setX = gsap.quickSetter(element, "x", "px") as (v: number) => void;
    const setY = gsap.quickSetter(element, "y", "px") as (v: number) => void;
    const setR = rotate
      ? (gsap.quickSetter(element, "rotate", "deg") as (v: number) => void)
      : null;
    const setScaleX = squash
      ? (gsap.quickSetter(element, "scaleX") as (v: number) => void)
      : null;
    const setScaleY = squash
      ? (gsap.quickSetter(element, "scaleY") as (v: number) => void)
      : null;
    const setSkew = squash
      ? (gsap.quickSetter(element, "skewX", "deg") as (v: number) => void)
      : null;

    let currentX = 0;
    let currentY = 0;
    let currentEnergy = 0;
    let writtenEnergy = -1;
    let restFrames = 0;
    let asleep = false;
    let layered = false;

    const sample: LiquidSample = { dx: 0, dy: 0, energy: 0 };

    const wake = () => {
      if (!layered) {
        element.style.willChange = "transform";
        layered = true;
      }
      asleep = false;
      restFrames = 0;
    };

    const sleep = () => {
      currentX = 0;
      currentY = 0;
      currentEnergy = 0;
      setX(0);
      setY(0);
      if (setR) setR(0);
      if (setScaleX) setScaleX(1);
      if (setScaleY) setScaleY(1);
      if (setSkew) setSkew(0);
      if (energyVar && writtenEnergy !== 0) {
        element.style.setProperty("--e", "0");
        writtenEnergy = 0;
      }
      if (layered) {
        element.style.willChange = "";
        layered = false;
      }
      asleep = true;
    };

    const follow = ease ?? identity.lag;

    const unsubscribe = subscribeLiquid((tick: LiquidTick) => {
      if (!visible) return;

      /* Viewport-space position of this piece, from the tick's scroll snapshot:
         one scroll read per frame for the whole page, not one per element. */
      const viewportY = centreY - tick.scrollY;
      if (viewportY < -cull || viewportY > window.innerHeight + cull) return;

      const viewportX = centreX - tick.scrollX;

      sampleLiquid(viewportX, viewportY, sample);

      /* The piece's own amplitude, plus a curl perpendicular to the push, so
         two neighbouring pieces caught in the same current still travel along
         visibly different arcs. */
      const amp = strength * identity.amp;
      const curl = identity.swirl * swirl;

      const targetX = sample.dx * amp - sample.dy * curl;
      const targetY = sample.dy * amp + sample.dx * curl;

      const factor = 1 - Math.pow(1 - follow, tick.dt * 60);

      const nextX = currentX + (targetX - currentX) * factor;
      const nextY = currentY + (targetY - currentY) * factor;
      const nextEnergy =
        currentEnergy + (sample.energy - currentEnergy) * factor;

      const moved =
        Math.abs(nextX - currentX) +
        Math.abs(nextY - currentY) +
        Math.abs(nextEnergy - currentEnergy);

      const settled =
        Math.abs(nextX) < 0.03 &&
        Math.abs(nextY) < 0.03 &&
        nextEnergy < 0.01 &&
        moved < 0.02;

      if (settled) {
        restFrames += 1;
        if (restFrames > SLEEP_FRAMES) {
          if (!asleep) sleep();
          return;
        }
      } else {
        if (asleep) wake();
        restFrames = 0;
      }

      currentX = nextX;
      currentY = nextY;
      currentEnergy = nextEnergy;

      setX(currentX);
      setY(currentY);
      if (setR) setR(currentX * rotate * identity.spin * 0.06);

      if (squash) {
        const deform = currentEnergy * identity.squash * squash;
        setScaleX!(1 + deform * 0.035);
        setScaleY!(1 - deform * 0.028);
        setSkew!(currentX * 0.02 * identity.spin);
      }

      if (energyVar) {
        const stepped =
          Math.round(Math.min(currentEnergy, 1) / ENERGY_STEP) * ENERGY_STEP;
        if (stepped !== writtenEnergy) {
          element.style.setProperty("--e", stepped.toFixed(2));
          writtenEnergy = stepped;
        }
      }
    });

    return () => {
      unsubscribe();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      release();
      gsap.set(element, {
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
      });
      element.style.willChange = "";
      element.style.removeProperty("--e");
    };
  }, [cull, ease, enabled, energyVar, id, rotate, squash, strength, swirl]);

  return ref;
}
