import { onPointerMove } from "./pointer";
import { isMobile } from "./platform";

/**
 * liquid.ts — the shared liquid field.
 *
 * There is one body of liquid on this site. The WebGL layer renders it, the
 * DOM floats on it, and both are driven from this one file, so the picture
 * behind the page and the movement of the page itself can never disagree.
 *
 * How it works, in three sentences: the pointer pushes velocity into a coarse
 * grid; every frame that grid is advected along itself, blurred a little and
 * damped a little; anything that wants to move samples the grid at its own
 * position. That is a fluid, minus the pressure solve nobody could see at
 * this scale and at this price.
 *
 * UNITS. Velocity is stored in viewport fractions per second: 1.0 means "one
 * screen width per second". Nothing here is in pixels, so the same field
 * behaves identically on a 13 inch laptop and a 34 inch monitor, and the GL
 * layer can consume it without knowing anything about CSS pixels.
 *
 * Rules this file exists to enforce:
 *  - ONE requestAnimationFrame loop for the whole effect. The canvas, the
 *    drifting windows and the drifting headlines are all subscribers to it.
 *  - The loop STOPS when the liquid is still and nobody needs continuous
 *    frames. An idle tab must cost nothing.
 *  - window.scrollY is read exactly once per frame, here, and handed to every
 *    subscriber. Subscribers never read layout themselves; that is how a
 *    dozen animated elements stay at one layout read per frame instead of a
 *    dozen.
 *  - The pointer listener is reference counted, so a build that never mounts
 *    a liquid consumer attaches nothing at all.
 */

export type LiquidSample = {
  /** Horizontal displacement in CSS pixels. */
  dx: number;
  /** Vertical displacement in CSS pixels. */
  dy: number;
  /** Local disturbance, 0 at rest, ~1 directly under a fast pointer. */
  energy: number;
};

export type LiquidTick = {
  /** Seconds since the loop first started. */
  time: number;
  /** Clamped frame delta in seconds. */
  dt: number;
  /** Field-wide disturbance, 0 at rest. */
  energy: number;
  /** The single layout read of the frame, shared with every subscriber. */
  scrollX: number;
  scrollY: number;
};

type Subscriber = {
  fn: (tick: LiquidTick) => void;
  continuous: boolean;
};

/* --- Grid ---------------------------------------------------------------- */

/* A phone gets a coarser grid: smaller screen, blunter instrument, real
   saving. This is read once at module load, which is exactly when the
   platform decision is made. */
const COLS = isMobile() ? 22 : 34;
const ROWS = isMobile() ? 13 : 19;
const CELLS = COLS * ROWS;

const vx = new Float32Array(CELLS);
const vy = new Float32Array(CELLS);
const tx = new Float32Array(CELLS);
const ty = new Float32Array(CELLS);

/**
 * Seconds of travel a DOM element is allowed to borrow from the field. At
 * 0.022 a hard flick moves a window about 20px and it settles in a beat.
 */
const DRIFT_TIME = 0.022;

/** Velocity that maps to ±1 when the field is encoded for the GPU. */
export const LIQUID_RANGE = 2.6;

/** Below this mean velocity the field counts as still. */
const SLEEP_ENERGY = 0.0009;

let energy = 0;
let width = 1;
let height = 1;

const readViewport = () => {
  width = Math.max(1, window.innerWidth);
  height = Math.max(1, window.innerHeight);
};

const idx = (col: number, row: number) => row * COLS + col;

const clampInt = (value: number, max: number) =>
  value < 0 ? 0 : value > max ? max : value;

/* --- Sampling ------------------------------------------------------------ */

const scratch: LiquidSample = { dx: 0, dy: 0, energy: 0 };

/**
 * Bilinear read of the field at a viewport position, returned in CSS pixels.
 * Pass `out` to sample in a hot loop without allocating.
 */
export function sampleLiquid(
  x: number,
  y: number,
  out: LiquidSample = scratch,
): LiquidSample {
  const gx = (x / width) * (COLS - 1);
  const gy = (y / height) * (ROWS - 1);

  const x0 = clampInt(Math.floor(gx), COLS - 1);
  const y0 = clampInt(Math.floor(gy), ROWS - 1);
  const x1 = clampInt(x0 + 1, COLS - 1);
  const y1 = clampInt(y0 + 1, ROWS - 1);

  const fx = gx - Math.floor(gx);
  const fy = gy - Math.floor(gy);

  const i00 = idx(x0, y0);
  const i10 = idx(x1, y0);
  const i01 = idx(x0, y1);
  const i11 = idx(x1, y1);

  const topX = vx[i00] + (vx[i10] - vx[i00]) * fx;
  const botX = vx[i01] + (vx[i11] - vx[i01]) * fx;
  const sx = topX + (botX - topX) * fy;

  const topY = vy[i00] + (vy[i10] - vy[i00]) * fx;
  const botY = vy[i01] + (vy[i11] - vy[i01]) * fx;
  const sy = topY + (botY - topY) * fy;

  out.dx = sx * width * DRIFT_TIME;
  out.dy = sy * height * DRIFT_TIME;
  out.energy = Math.min(1, Math.hypot(sx, sy) * 0.9);
  return out;
}

/* --- Injection ----------------------------------------------------------- */

/**
 * Push the liquid at a viewport position. Velocity arrives in CSS pixels per
 * 60Hz frame, which is what lib/pointer.ts publishes, and is converted here.
 */
export function splatLiquid(
  x: number,
  y: number,
  pushX: number,
  pushY: number,
  force = 1,
): void {
  const gx = (x / width) * (COLS - 1);
  const gy = (y / height) * (ROWS - 1);

  const ax = (pushX / width) * 60 * 0.5 * force;
  const ay = (pushY / height) * 60 * 0.5 * force;

  const radius = 2.6;
  const minX = clampInt(Math.floor(gx - radius), COLS - 1);
  const maxX = clampInt(Math.ceil(gx + radius), COLS - 1);
  const minY = clampInt(Math.floor(gy - radius), ROWS - 1);
  const maxY = clampInt(Math.ceil(gy + radius), ROWS - 1);

  for (let row = minY; row <= maxY; row++) {
    for (let col = minX; col <= maxX; col++) {
      const dx = col - gx;
      const dy = row - gy;
      const fall = Math.exp(-(dx * dx + dy * dy) / (radius * 0.9));
      if (fall < 0.01) continue;
      const i = idx(col, row);
      vx[i] += ax * fall;
      vy[i] += ay * fall;
    }
  }

  start();
}

/**
 * A round pulse with no direction: what a tap, a click or an opening window
 * leaves behind. This is the touch half of the effect — a finger has no
 * hover, so a press has to be the event that disturbs the liquid.
 */
export function pulseLiquid(x: number, y: number, force = 1): void {
  const gx = (x / width) * (COLS - 1);
  const gy = (y / height) * (ROWS - 1);
  const radius = 3.4;

  const minX = clampInt(Math.floor(gx - radius), COLS - 1);
  const maxX = clampInt(Math.ceil(gx + radius), COLS - 1);
  const minY = clampInt(Math.floor(gy - radius), ROWS - 1);
  const maxY = clampInt(Math.ceil(gy + radius), ROWS - 1);

  for (let row = minY; row <= maxY; row++) {
    for (let col = minX; col <= maxX; col++) {
      const dx = col - gx;
      const dy = row - gy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius || dist < 0.0001) continue;
      const fall = Math.exp(-(dist * dist) / (radius * 0.8)) * force * 1.3;
      const i = idx(col, row);
      vx[i] += (dx / dist) * fall;
      vy[i] += (dy / dist) * fall;
    }
  }

  start();
}

/* --- Simulation ---------------------------------------------------------- */

const advect = (dt: number) => {
  /* Semi-Lagrangian: every cell asks where its liquid was a moment ago and
     takes what it finds there. This is the step that makes a push travel
     across the screen instead of sitting where it was made. */
  const spanX = (COLS - 1) * dt;
  const spanY = (ROWS - 1) * dt;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = idx(col, row);
      const px = col - vx[i] * spanX;
      const py = row - vy[i] * spanY;

      const fx0 = Math.floor(px);
      const fy0 = Math.floor(py);
      const x0 = clampInt(fx0, COLS - 1);
      const y0 = clampInt(fy0, ROWS - 1);
      const x1 = clampInt(x0 + 1, COLS - 1);
      const y1 = clampInt(y0 + 1, ROWS - 1);
      const fx = px - fx0;
      const fy = py - fy0;

      const i00 = idx(x0, y0);
      const i10 = idx(x1, y0);
      const i01 = idx(x0, y1);
      const i11 = idx(x1, y1);

      const topX = vx[i00] + (vx[i10] - vx[i00]) * fx;
      const botX = vx[i01] + (vx[i11] - vx[i01]) * fx;
      const topY = vy[i00] + (vy[i10] - vy[i00]) * fx;
      const botY = vy[i01] + (vy[i11] - vy[i01]) * fx;

      tx[i] = topX + (botX - topX) * fy;
      ty[i] = topY + (botY - topY) * fy;
    }
  }
};

const relax = (damp: number) => {
  /* Viscosity (blur into the neighbours) and drag (damp), in one pass, with
     no third buffer. */
  let sum = 0;

  for (let row = 0; row < ROWS; row++) {
    const up = row > 0 ? row - 1 : row;
    const down = row < ROWS - 1 ? row + 1 : row;

    for (let col = 0; col < COLS; col++) {
      const left = col > 0 ? col - 1 : col;
      const right = col < COLS - 1 ? col + 1 : col;
      const i = idx(col, row);

      const blurX =
        (tx[idx(left, row)] +
          tx[idx(right, row)] +
          tx[idx(col, up)] +
          tx[idx(col, down)]) *
        0.25;

      const blurY =
        (ty[idx(left, row)] +
          ty[idx(right, row)] +
          ty[idx(col, up)] +
          ty[idx(col, down)]) *
        0.25;

      const nextX = (tx[i] * 0.74 + blurX * 0.26) * damp;
      const nextY = (ty[i] * 0.74 + blurY * 0.26) * damp;

      vx[i] = nextX;
      vy[i] = nextY;
      sum += Math.abs(nextX) + Math.abs(nextY);
    }
  }

  energy = sum / CELLS;
};

/* --- Loop ---------------------------------------------------------------- */

const subscribers = new Set<Subscriber>();
let continuousCount = 0;
let frame = 0;
let last = 0;
let started = 0;

const tick: LiquidTick = {
  time: 0,
  dt: 0,
  energy: 0,
  scrollX: 0,
  scrollY: 0,
};

const step = (now: number) => {
  frame = requestAnimationFrame(step);

  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;

  /* Damping is per second, so a 120Hz display does not damp twice as fast as
     a 60Hz one. */
  const damp = Math.pow(0.2, dt);

  advect(dt);
  relax(damp);

  tick.time = (now - started) / 1000;
  tick.dt = dt;
  tick.energy = energy;
  tick.scrollX = window.scrollX;
  tick.scrollY = window.scrollY;

  for (const sub of subscribers) sub.fn(tick);

  if (energy < SLEEP_ENERGY && continuousCount === 0) stopLoop();
};

function start(): void {
  if (frame) return;
  if (typeof window === "undefined") return;
  if (document.hidden) return;
  last = performance.now();
  if (!started) started = last;
  frame = requestAnimationFrame(step);
}

function stopLoop(): void {
  if (!frame) return;
  cancelAnimationFrame(frame);
  frame = 0;
}

/**
 * Subscribe to the frame loop. `continuous` keeps the loop alive while the
 * subscriber is mounted — the canvas needs that so dye can keep spreading
 * and fading; a drifting headline does not.
 */
export function subscribeLiquid(
  fn: (tick: LiquidTick) => void,
  options: { continuous?: boolean } = {},
): () => void {
  const sub: Subscriber = { fn, continuous: options.continuous === true };
  subscribers.add(sub);
  if (sub.continuous) continuousCount++;
  start();

  return () => {
    if (!subscribers.delete(sub)) return;
    if (sub.continuous) continuousCount = Math.max(0, continuousCount - 1);
    if (subscribers.size === 0) stopLoop();
  };
}

export function liquidEnergy(): number {
  return energy;
}

/** Raw field access. The WebGL layer is the only legitimate caller. */
export function liquidField(): {
  cols: number;
  rows: number;
  vx: Float32Array;
  vy: Float32Array;
} {
  return { cols: COLS, rows: ROWS, vx, vy };
}

/* --- Pointer wiring (reference counted) ---------------------------------- */

let consumers = 0;
let detachPointer: (() => void) | null = null;
let detachViewport: (() => void) | null = null;

/**
 * Called by every consumer on mount. The first one wires the pointer up; the
 * last one out turns the lights off and empties the field.
 */
export function attachLiquid(): () => void {
  consumers++;

  if (consumers === 1 && typeof window !== "undefined") {
    readViewport();

    const onResize = () => readViewport();
    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else if (continuousCount > 0 || energy > SLEEP_ENERGY) start();
    };

    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    detachViewport = () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };

    /* One subscription to the shared pointer stream, already coalesced to a
       single callback per frame by lib/pointer.ts. */
    detachPointer = onPointerMove((state) => {
      if (!state.present) return;
      if (state.speed < 0.05 && !state.down) return;
      splatLiquid(state.x, state.y, state.vx, state.vy, state.down ? 1.5 : 1);
    });
  }

  return () => {
    consumers = Math.max(0, consumers - 1);
    if (consumers > 0) return;
    detachPointer?.();
    detachViewport?.();
    detachPointer = null;
    detachViewport = null;
    stopLoop();
    vx.fill(0);
    vy.fill(0);
    tx.fill(0);
    ty.fill(0);
    energy = 0;
  };
}
