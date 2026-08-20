/**
 * pointer.ts — one pointer tracker for the whole application.
 *
 * Why this file exists
 * --------------------
 * Three separate effects need to know where the pointer is: the WebGL field
 * behind the hero, the cursor lens, and the type distortion. The obvious
 * implementation gives each of them its own `pointermove` listener, and that
 * is exactly how a site starts dropping frames: a mouse reports at 120Hz on a
 * modern trackpad, so three listeners × 120 events × whatever each one does
 * per event is real work, most of it thrown away before the next paint.
 *
 * Here there is one passive listener on the window. It writes into one shared
 * object and notifies subscribers at most once per animation frame. Adding a
 * fourth or a tenth consumer costs one function call per frame, not one more
 * event stream.
 *
 * Touch is a first-class citizen, not an afterthought. Pointer Events give us
 * mouse, pen and finger through the same API, so the distortion that follows
 * a cursor on a laptop follows a fingertip on a phone with no separate code
 * path. `present` is what tells consumers whether there is anything to draw:
 * a mouse is present as soon as it moves, a finger only while it touches the
 * glass.
 *
 * Nothing here is React-specific on purpose. Hooks and plain classes both
 * subscribe the same way, and the listener attaches only while at least one
 * consumer is alive (see holdPointer).
 */

export type PointerSnapshot = {
  /** Viewport coordinates, in CSS pixels. */
  x: number;
  y: number;
  /** The same position normalised to 0..1, ready for a shader. */
  nx: number;
  ny: number;
  /** Velocity in pixels per 60Hz frame, decayed when the pointer stops. */
  vx: number;
  vy: number;
  /** Magnitude of the velocity, for effects that only need "how fast". */
  speed: number;
  /** True while a button is held or a finger is on the glass. */
  down: boolean;
  /** True when the last event came from a finger or a pen, not a mouse. */
  touch: boolean;
  /** False before the first move, and after a finger lifts. */
  present: boolean;
};

type MoveListener = (state: PointerSnapshot) => void;
type ImpulseListener = (nx: number, ny: number) => void;

/** The single shared snapshot. Read it, never write to it. */
export const pointerState: PointerSnapshot = {
  x: 0,
  y: 0,
  nx: 0.5,
  ny: 0.5,
  vx: 0,
  vy: 0,
  speed: 0,
  down: false,
  touch: false,
  present: false,
};

const moveListeners = new Set<MoveListener>();
const impulseListeners = new Set<ImpulseListener>();

let attached = false;
let holders = 0;
let frame = 0;
/* لإطار التخميد مُعرّفه الخاصّ. بدونه لا يقدر detach على إلغائه، وهذا بالضبط
   ما كان يترك حلقة معلّقة حيّة بعد كل تفكيك. */
let decayFrame = 0;
let dirty = false;
let lastX = 0;
let lastY = 0;
let lastTime = 0;

const isBrowser = typeof window !== "undefined";

/** True for a mouse or a trackpad: hover exists and the pointer is precise. */
export function isFinePointer(): boolean {
  if (!isBrowser) return false;
  return window.matchMedia("(pointer: fine)").matches;
}

/** True for a finger. Kept as its own helper so intent reads clearly. */
export function isCoarsePointer(): boolean {
  if (!isBrowser) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Publish the snapshot to every subscriber, once per frame.
 * Events are coalesced: ten moves between two paints produce one callback,
 * carrying the newest position. Nobody ever renders a stale one.
 */
function flush() {
  frame = 0;
  if (!dirty) return;
  dirty = false;
  for (const listener of moveListeners) listener(pointerState);
}

/* نشر وحده: إطار واحد للبثّ، بلا إيقاظ لأي حلقة أخرى. */
function publish() {
  dirty = true;
  if (frame) return;
  frame = requestAnimationFrame(flush);
}

/* التخميد يستيقظ حين توجد سرعة تُخمَّد، لا قبل ذلك. وحارس decayFrame يجعل
   وجود حلقتين مستحيلاً مهما تكرّر التركيب والتفكيك في الإطار الواحد. */
function wakeDecay() {
  if (!attached || decayFrame) return;
  decayFrame = requestAnimationFrame(decay);
}

function schedule() {
  publish();
  wakeDecay();
}

function updateFromEvent(event: PointerEvent) {
  const now = event.timeStamp || performance.now();
  const dt = lastTime ? Math.max(now - lastTime, 8) : 16.7;

  // Velocity is expressed per 60Hz frame so consumers can use it directly,
  // whatever the real event rate of the device happens to be.
  pointerState.vx = ((event.clientX - lastX) / dt) * 16.7;
  pointerState.vy = ((event.clientY - lastY) / dt) * 16.7;
  pointerState.speed = Math.hypot(pointerState.vx, pointerState.vy);

  pointerState.x = event.clientX;
  pointerState.y = event.clientY;
  pointerState.nx = event.clientX / window.innerWidth;
  pointerState.ny = event.clientY / window.innerHeight;
  pointerState.touch = event.pointerType !== "mouse";
  pointerState.present = true;

  lastX = event.clientX;
  lastY = event.clientY;
  lastTime = now;

  schedule();
}

function onMove(event: PointerEvent) {
  updateFromEvent(event);
}

function onDown(event: PointerEvent) {
  updateFromEvent(event);
  pointerState.down = true;
  // A press is the moment the field should react to: every subscriber gets
  // the normalised position so it can start a ripple exactly there.
  for (const listener of impulseListeners) {
    listener(pointerState.nx, pointerState.ny);
  }
}

function onUp(event: PointerEvent) {
  pointerState.down = false;
  // A finger that lifts is gone; a mouse that stops is still there. Getting
  // this wrong leaves a distortion frozen on screen after a tap.
  if (event.pointerType !== "mouse") {
    pointerState.present = false;
    pointerState.vx = 0;
    pointerState.vy = 0;
    pointerState.speed = 0;
  }
  schedule();
}

function onLeave() {
  pointerState.present = false;
  pointerState.down = false;
  pointerState.speed = 0;
  schedule();
}

/**
 * Decay. Without this the last recorded velocity would stay high forever
 * whenever the pointer stops moving, because no event is fired when nothing
 * happens — and every velocity-driven effect would freeze mid-swing.
 */
function decay() {
  decayFrame = 0;
  if (!attached) return;

  if (pointerState.speed <= 0.01) {
    /* بلغنا السكون: نُصفّر مرّة واحدة، نُبلّغ المشتركين، ثم ننام. لا إطار بعد
       هذه اللحظة حتى تتحرّك يد، وأوّل حركة توقظنا عبر schedule. */
    if (pointerState.speed !== 0) {
      pointerState.vx = 0;
      pointerState.vy = 0;
      pointerState.speed = 0;
      publish();
    }
    return;
  }

  pointerState.vx *= 0.86;
  pointerState.vy *= 0.86;
  pointerState.speed = Math.hypot(pointerState.vx, pointerState.vy);
  /* schedule يُعيد تسليح التخميد عبر wakeDecay، فلا تسليح ثانٍ هنا. */
  schedule();
}

function attach() {
  if (attached || !isBrowser) return;
  attached = true;
  // Passive: this tracker never calls preventDefault, so the browser is free
  // to keep scrolling while it runs.
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });
  window.addEventListener("pointerleave", onLeave, { passive: true });
  document.addEventListener("mouseleave", onLeave, { passive: true });
  /* لا حلقة عند الربط: السرعة صفر ولا شيء يُخمَّد. أوّل حركة تفتحها. */
}

function detach() {
  if (!attached) return;
  attached = false;
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerdown", onDown);
  window.removeEventListener("pointerup", onUp);
  window.removeEventListener("pointercancel", onUp);
  window.removeEventListener("pointerleave", onLeave);
  document.removeEventListener("mouseleave", onLeave);
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  if (decayFrame) {
    cancelAnimationFrame(decayFrame);
    decayFrame = 0;
  }
  /* لا نترك سرعة قديمة في الحالة المشتركة: أوّل مستهلك يأتي بعد هذا يجب أن
     يجد مؤشّراً ساكناً، لا بقايا حركة من جلسة سابقة. */
  dirty = false;
  pointerState.vx = 0;
  pointerState.vy = 0;
  pointerState.speed = 0;
  pointerState.down = false;
}

/* شرط التفكيك مكتوب مرّة واحدة. ثلاث نسخ منه تعني، عاجلاً أو آجلاً، نسخة
   تنسى صنفاً من المشتركين — وهو ما وقع فعلاً مع مشتركي النقر. */
function maybeDetach() {
  if (holders > 0) return;
  if (moveListeners.size > 0) return;
  if (impulseListeners.size > 0) return;
  detach();
}

/**
 * Keep the tracker running without subscribing to the per-frame callback.
 * Used by consumers that read pointerState inside their own loop, such as the
 * WebGL field. Reference counted: the listeners exist while at least one
 * holder or subscriber does, and are removed when the last one leaves.
 */
export function holdPointer(): () => void {
  holders += 1;
  attach();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    maybeDetach();
  };
}

/**
 * Subscribe to the coalesced pointer stream.
 * @returns an unsubscribe function — call it in your effect cleanup.
 */
export function onPointerMove(listener: MoveListener): () => void {
  moveListeners.add(listener);
  attach();
  return () => {
    moveListeners.delete(listener);
    maybeDetach();
  };
}

/**
 * Subscribe to presses: a click, a tap, a pen touch. The callback receives the
 * normalised position so the caller can throw a ripple from that exact point.
 */
export function onPointerImpulse(listener: ImpulseListener): () => void {
  impulseListeners.add(listener);
  attach();
  return () => {
    impulseListeners.delete(listener);
    maybeDetach();
  };
}
