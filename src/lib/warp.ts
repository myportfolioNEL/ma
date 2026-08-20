/**
 * warp.ts — arrival distortion, on a short lease.
 *
 * The brief: windows should not fade in like every other portfolio. They
 * should arrive unresolved — warped, as if still forming in the liquid — and
 * settle when you make contact with them.
 *
 * The technique is an SVG filter: feTurbulence generates a Perlin-style noise
 * field, feDisplacementMap pushes every pixel of the element along that field.
 * Animating the displacement `scale` from a large value to zero is the element
 * resolving itself out of the noise.
 *
 * The cost is real. Filters are rasterised, not composited, and an animated
 * filter re-rasterises the element every frame. That is affordable for 850ms,
 * on two elements at a time, once. It is not affordable as a permanent state,
 * which is why the last thing this module does is take the filter off again.
 *
 * Everything here is plain DOM plus GSAP. No new dependency.
 */

import { gsap, prefersReducedMotion } from "./motion";
import { isCoarsePointer } from "./pointer";

const SVG_NS = "http://www.w3.org/2000/svg";

/** واحد. اثنان متزامنان من feDisplacementMap يُسقِطان الإطارات أثناء التمرير،
    والزائر لا يرى إلاّ الأقرب إلى عينه على كل حال. الثاني ينتظر دوره. */
const POOL_SIZE = 1;

type Slot = {
  url: string;
  displacement: SVGFEDisplacementMapElement;
  turbulence: SVGFETurbulenceElement;
  busy: boolean;
};

let host: SVGSVGElement | null = null;
let slots: Slot[] = [];

/** True while a hover pulse is running, so two can never overlap. */
let pulseBusy = false;

/** Per-element cooldown, so a nervous pointer cannot machine-gun the filter. */
const lastPulse = new WeakMap<Element, number>();

export type WarpBudget = "full" | "cheap" | "none";

/**
 * What this device and this user have agreed to pay for.
 *
 * "full"  — real displacement.
 * "cheap" — opacity and scale only.
 * "none"  — the element simply appears; reduced motion is a request, not a hint.
 */
export function warpBudget(): WarpBudget {
  if (typeof window === "undefined") return "none";
  if (prefersReducedMotion()) return "none";

  const cores =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 8;

  /* Phones and low-core laptops get the cheap path. A distortion that stutters
     is worse than no distortion: it reads as a bug, not as an effect. */
  if (isCoarsePointer()) return "cheap";
  if (cores <= 4) return "cheap";

  return "full";
}

function ensurePool(): void {
  if (host || typeof document === "undefined") return;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.cssText =
    "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";

  const defs = document.createElementNS(SVG_NS, "defs");

  for (let index = 0; index < POOL_SIZE; index += 1) {
    const id = `warp-${index}`;

    const filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    /* The filter region is grown so displaced pixels are not clipped at the
       element's own edges — without this the warp looks cut off. */
    filter.setAttribute("x", "-14%");
    filter.setAttribute("y", "-14%");
    filter.setAttribute("width", "128%");
    filter.setAttribute("height", "128%");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const turbulence = document.createElementNS(
      SVG_NS,
      "feTurbulence",
    ) as SVGFETurbulenceElement;
    /* fractalNoise is the softer of the two types: liquid, not television
       static. Two octaves is the performance ceiling for an animated node. */
    turbulence.setAttribute("type", "fractalNoise");
    turbulence.setAttribute("baseFrequency", "0.011 0.019");
    turbulence.setAttribute("numOctaves", "2");
    turbulence.setAttribute("seed", String(3 + index * 11));
    turbulence.setAttribute("result", "noise");

    const displacement = document.createElementNS(
      SVG_NS,
      "feDisplacementMap",
    ) as SVGFEDisplacementMapElement;
    displacement.setAttribute("in", "SourceGraphic");
    displacement.setAttribute("in2", "noise");
    displacement.setAttribute("scale", "0");
    displacement.setAttribute("xChannelSelector", "R");
    displacement.setAttribute("yChannelSelector", "G");

    filter.appendChild(turbulence);
    filter.appendChild(displacement);
    defs.appendChild(filter);

    slots.push({
      url: `url(#${id})`,
      displacement,
      turbulence,
      busy: false,
    });
  }

  svg.appendChild(defs);
  document.body.appendChild(svg);
  host = svg;
}

type Lease = {
  url: string;
  setScale: (value: number) => void;
  setFrequency: (x: number, y: number) => void;
  release: () => void;
};

/** Take a filter out of the pool, or null when both are in use. */
function leaseWarp(): Lease | null {
  ensurePool();

  const slot = slots.find((candidate) => !candidate.busy);
  if (!slot) return null;

  slot.busy = true;
  let released = false;

  return {
    url: slot.url,
    setScale: (value) => {
      slot.displacement.setAttribute("scale", value.toFixed(2));
    },
    setFrequency: (x, y) => {
      slot.turbulence.setAttribute("baseFrequency", `${x} ${y}`);
    },
    release: () => {
      if (released) return;
      released = true;
      slot.displacement.setAttribute("scale", "0");
      slot.busy = false;
    },
  };
}

export type WarpHandle = {
  /** Contact resolves the image: speed the settle up instead of waiting. */
  settle: (speed?: number) => void;
  /** Kill it and clean up, e.g. on unmount. */
  cancel: () => void;
};

const NOOP_HANDLE: WarpHandle = {
  settle: () => {},
  cancel: () => {},
};

export type WarpInOptions = {
  /** Starting displacement in pixels. 18–26 reads as liquid; beyond that as damage. */
  from?: number;
  /** Seconds. Keep it under one; this is an arrival, not a scene. */
  duration?: number;
  /** Fired once the element is clean again. */
  onSettled?: () => void;
};

/**
 * Arrive distorted, then resolve.
 *
 * The element passed here must be a layer that owns nothing else: no drift
 * transform, no reveal tween. In this project that is `.win__warp`, an inner
 * wrapper that exists only to hold a filter for less than a second.
 *
 * Note for whoever reads this next: `filter` creates a containing block, so a
 * `position: fixed` child inside a filtered element would anchor to the element
 * instead of the viewport. Nothing inside these windows is fixed. Keep it that
 * way, or move the filter to a different wrapper.
 */
export function warpIn(
  element: HTMLElement,
  options: WarpInOptions = {},
): WarpHandle {
  const { from = 22, duration = 0.86, onSettled } = options;

  const budget = warpBudget();

  if (budget === "none") {
    gsap.set(element, { opacity: 1 });
    onSettled?.();
    return NOOP_HANDLE;
  }

  /* A tab in the background should not pay for an animation nobody is looking
     at; it should simply be finished when the user comes back. */
  if (typeof document !== "undefined" && document.hidden) {
    gsap.set(element, { opacity: 1 });
    onSettled?.();
    return NOOP_HANDLE;
  }

  const lease = budget === "full" ? leaseWarp() : null;

  /* ---- cheap path: no filter at all -------------------------------------- */
  if (!lease) {
    const tween = gsap.fromTo(
      element,
      { opacity: 0.2, scale: 1.035 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.58,
        ease: "power2.out",
        clearProps: "scale",
        onComplete: () => onSettled?.(),
      },
    );

    return {
      settle: (speed = 2.4) => {
        tween.timeScale(Math.max(tween.timeScale(), speed));
      },
      cancel: () => {
        tween.kill();
        gsap.set(element, { opacity: 1, scale: 1, clearProps: "scale" });
      },
    };
  }

  /* ---- full path: real displacement -------------------------------------- */
  const state = { scale: from };

  element.style.filter = lease.url;
  element.style.willChange = "filter, opacity";
  lease.setScale(from);

  const cleanup = () => {
    element.style.filter = "";
    element.style.willChange = "";
    lease.release();
  };

  const timeline = gsap.timeline({
    onComplete: () => {
      cleanup();
      onSettled?.();
    },
  });

  timeline
    .to(state, {
      scale: 0,
      duration,
      ease: "power3.out",
      onUpdate: () => lease.setScale(state.scale),
    })
    .fromTo(
      element,
      { opacity: 0.32 },
      { opacity: 1, duration: duration * 0.72, ease: "power2.out" },
      0,
    );

  return {
    settle: (speed = 2.6) => {
      timeline.timeScale(Math.max(timeline.timeScale(), speed));
    },
    cancel: () => {
      timeline.kill();
      cleanup();
      gsap.set(element, { opacity: 1 });
    },
  };
}

export type WarpPulseOptions = {
  /** Peak displacement in pixels. Small: this is a ripple, not an arrival. */
  amount?: number;
  duration?: number;
  /** Minimum gap between two pulses on the same element, in ms. */
  cooldown?: number;
};

/**
 * A single ripple through an element that has already settled — used when the
 * pointer first enters a window, so contact visibly disturbs the surface.
 *
 * Three guards, all of them deliberate:
 *   1. Only on the "full" budget.
 *   2. Only one pulse in the whole document at a time.
 *   3. One per element per cooldown window.
 *
 * If any guard says no, nothing happens — and nothing is missing, because the
 * colour and shape change on hover is driven by CSS from the liquid field and
 * happens regardless.
 */
export function warpPulse(
  element: HTMLElement,
  options: WarpPulseOptions = {},
): void {
  const { amount = 13, duration = 0.42, cooldown = 1100 } = options;

  if (warpBudget() !== "full") return;
  if (pulseBusy) return;

  const now = performance.now();
  const previous = lastPulse.get(element) ?? -Infinity;
  if (now - previous < cooldown) return;

  const lease = leaseWarp();
  if (!lease) return;

  lastPulse.set(element, now);
  pulseBusy = true;

  const state = { scale: 0 };
  element.style.filter = lease.url;
  element.style.willChange = "filter";

  const finish = () => {
    element.style.filter = "";
    element.style.willChange = "";
    lease.release();
    pulseBusy = false;
  };

  gsap
    .timeline({ onComplete: finish, onInterrupt: finish })
    .to(state, {
      scale: amount,
      duration: duration * 0.35,
      ease: "power2.out",
      onUpdate: () => lease.setScale(state.scale),
    })
    .to(state, {
      scale: 0,
      duration: duration * 0.65,
      ease: "power2.inOut",
      onUpdate: () => lease.setScale(state.scale),
    });
}

/** For teardown in dev/HMR. Not used in production paths. */
export function releaseAllWarps(): void {
  slots.forEach((slot) => {
    slot.busy = false;
    slot.displacement.setAttribute("scale", "0");
  });
  pulseBusy = false;
  if (host && host.parentNode) host.parentNode.removeChild(host);
  host = null;
  slots = [];
}

/* ==========================================================================
   ROUND 25 — الدخان

   warpPulse يعطي موجة تعود إلى الصفر: "لمستُ سطحاً".
   warpSmoke لا يعود: يرتفع التشويه ويبقى مرتفعاً بينما يبهت العنصر، فيقرأ
   كأن الشكل تفكّك إلى ضباب. هذا هو الفرق بين hover و press في هذا الموقع.

   نفس الحُرّاس الثلاثة الموجودة في warpPulse، للسبب نفسه:
     1. الميزانية "full" فقط.
     2. عنصر واحد في المستند في كل لحظة.
     3. تبريد لكل عنصر.
   إذا رفض أي حارس، لا يحدث شيء — ولا شيء ناقص، لأن نفخات الدخان في CSS
   تعمل وحدها وهي المسؤولة عن المعنى البصري.
   ========================================================================== */

export type WarpSmokeOptions = {
  /** ذروة الإزاحة بالبكسل. 18–30 يقرأ كدخان؛ أكثر من ذلك يقرأ كعطل. */
  amount?: number;
  duration?: number;
  cooldown?: number;
};

export function warpSmoke(
  element: HTMLElement,
  options: WarpSmokeOptions = {},
): void {
  const { amount = 24, duration = 0.62, cooldown = 620 } = options;

  if (warpBudget() !== "full") return;
  if (pulseBusy) return;

  const now = performance.now();
  const previous = lastPulse.get(element) ?? -Infinity;
  if (now - previous < cooldown) return;

  const lease = leaseWarp();
  if (!lease) return;

  lastPulse.set(element, now);
  pulseBusy = true;

  /* تردد أعلى من نبضة الـ hover: حبيبات أصغر = دخان لا ماء. */
  lease.setFrequency(0.022, 0.031);

  const state = { scale: 0 };
  element.style.filter = lease.url;
  element.style.willChange = "filter";

  const finish = () => {
    element.style.filter = "";
    element.style.willChange = "";
    lease.setFrequency(0.011, 0.019); /* أعِد الإعداد الافتراضي للمسبح */
    lease.release();
    pulseBusy = false;
  };

  gsap
    .timeline({ onComplete: finish, onInterrupt: finish })
    .to(state, {
      scale: amount,
      duration: duration * 0.42,
      ease: "power2.out",
      onUpdate: () => lease.setScale(state.scale),
    })
    .to(state, {
      scale: 0,
      duration: duration * 0.58,
      ease: "power2.inOut",
      onUpdate: () => lease.setScale(state.scale),
    });
}

/* --- نفخات الدخان في CSS ------------------------------------------------
   تعمل على كل الميزانيات ما عدا "none". العنصر يحمل data-smoke="on" لمدة
   الأنيميشن ثم يُنزع، فلا يبقى في المستند أي عنصر عليه blur دائم. */

const smokeUntil = new WeakMap<HTMLElement, number>();
let smokeTimer = 0;

export function smokeBurst(element: HTMLElement | null, ms = 700): void {
  if (!element) return;
  if (warpBudget() === "none") return;

  const now = performance.now();
  if ((smokeUntil.get(element) ?? 0) > now) return;
  smokeUntil.set(element, now + ms);

  element.setAttribute("data-smoke", "on");

  window.clearTimeout(smokeTimer);
  smokeTimer = window.setTimeout(() => {
    element.removeAttribute("data-smoke");
  }, ms);
}

