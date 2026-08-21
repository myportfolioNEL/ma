import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  CV_VIEW_LINGER,
  LOUPE_REST,
  canLoupe,
  loupeFrame,
  stepZoom,
} from "../lib/cvview";

/**
 * useLoupe - drag the grip, and whatever is under it is magnified.
 *
 * WHAT THIS HOOK DOES NOT DO: re-render. A drag produces one pointermove per
 * frame at best and several per frame at worst, and turning each of those into
 * React state would mean re-rendering a dialog that contains two iframes -
 * which on some engines re-creates a browsing context. So the position of the
 * box and the scale of the copy are written as CSS custom properties on one
 * element inside one requestAnimationFrame, and React is told only about the
 * four things that change the shape of the tree: armed, mounted, dragging,
 * zoom. Same division of labour as lib/energy.ts and useLiquidDrift: state for
 * structure, custom properties for motion.
 *
 * WHY setPointerCapture IS THE WHOLE TRICK. The grip sits in the corner and the
 * thing being magnified is an iframe. Without capture, the first pointermove
 * that crossed into the iframe would be delivered to the iframe and the drag
 * would die on contact. Capture disables hit-testing for that pointer
 * entirely, so every move keeps arriving here until the finger lifts. CaseSheet
 * already uses the same call for its drag-to-dismiss handle; this is that
 * pattern, not a new one.
 *
 * WHY THE BOX STAYS AFTER YOU RELEASE. The gesture means "show me this part",
 * and a box that vanished with the finger would answer it for exactly as long
 * as you were unable to read it. Press the grip again, press Escape, or close
 * the window to put it away.
 *
 * WHY THE SECOND COPY IS MOUNTED LATE AND UNMOUNTED LATER. It exists only
 * between the first press of the grip and CV_VIEW_LINGER after the dismissal. A
 * visitor who never uses the magnifier never pays for it, and one who dismisses
 * and immediately re-arms it does not pay twice.
 */

type Options = {
  /** The side of the zoom box in CSS pixels. */
  size: number;
  /** False when there is nothing worth magnifying yet. */
  enabled: boolean;
};

export function useLoupe<P extends HTMLElement, L extends HTMLElement>({
  size,
  enabled,
}: Options) {
  const paneRef = useRef<P | null>(null);
  const loupeRef = useRef<L | null>(null);

  const [armed, setArmed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(LOUPE_REST);

  const zoomRef = useRef(LOUPE_REST);
  const pointRef = useRef({ x: 0, y: 0 });
  const rectRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const draggingRef = useRef(false);
  const armedRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(0);
  const lingerRef = useRef(0);

  /* --- reading the pane once, not once per frame ------------------------- */

  const measure = useCallback(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const rect = pane.getBoundingClientRect();
    rectRef.current = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    const box = loupeRef.current;
    if (!box) return;
    box.style.setProperty("--lp-size", `${size}px`);
    box.style.setProperty("--lp-w", `${Math.round(rect.width)}px`);
    box.style.setProperty("--lp-h", `${Math.round(rect.height)}px`);
  }, [size]);

  const write = useCallback(() => {
    frameRef.current = 0;
    const box = loupeRef.current;
    if (!box) return;

    const rect = rectRef.current;
    const frame = loupeFrame({
      x: pointRef.current.x,
      y: pointRef.current.y,
      paneW: rect.width,
      paneH: rect.height,
      size,
      zoom: zoomRef.current,
    });

    box.style.setProperty("--lp-x", `${frame.left}px`);
    box.style.setProperty("--lp-y", `${frame.top}px`);
    box.style.setProperty("--lp-tx", `${frame.tx}px`);
    box.style.setProperty("--lp-ty", `${frame.ty}px`);
    box.style.setProperty("--lp-z", String(zoomRef.current));
  }, [size]);

  const schedule = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(write);
  }, [write]);

  const point = useCallback(
    (clientX: number, clientY: number) => {
      const rect = rectRef.current;
      pointRef.current = { x: clientX - rect.left, y: clientY - rect.top };
      schedule();
    },
    [schedule],
  );

  /* --- the gesture ------------------------------------------------------- */

  const dismiss = useCallback(() => {
    draggingRef.current = false;
    armedRef.current = false;
    setDragging(false);
    setArmed(false);

    if (lingerRef.current) window.clearTimeout(lingerRef.current);
    lingerRef.current = window.setTimeout(() => {
      lingerRef.current = 0;
      setMounted(false);
    }, CV_VIEW_LINGER);
  }, []);

  const onGripDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || !canLoupe()) return;

      /* The grip is a button. Without this, a touch drag scrolls the sheet
         instead of moving the box, and a mouse drag selects text. The CSS also
         sets touch-action: none on the grip; both are needed, because
         preventDefault on pointerdown does not stop a scroll that the browser
         has already decided to own. */
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      if (lingerRef.current) {
        window.clearTimeout(lingerRef.current);
        lingerRef.current = 0;
      }

      measure();

      movedRef.current = false;
      startRef.current = { x: event.clientX, y: event.clientY };
      draggingRef.current = true;
      armedRef.current = true;

      setMounted(true);
      setArmed(true);
      setDragging(true);

      point(event.clientX, event.clientY);
    },
    [enabled, measure, point],
  );

  const onGripMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!draggingRef.current) return;

      const start = startRef.current;
      if (
        !movedRef.current &&
        Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y) > 4
      ) {
        movedRef.current = true;
      }

      point(event.clientX, event.clientY);
    },
    [point],
  );

  const onGripUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }, []);

  /* A press with no movement is a toggle, not a drag: it is how the box is put
     away with the same control that summoned it. */
  const onGripClick = useCallback(() => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    if (armedRef.current) dismiss();
  }, [dismiss]);

  const zoomBy = useCallback(
    (direction: number) => {
      const next = stepZoom(zoomRef.current, direction);
      if (next === zoomRef.current) return;
      zoomRef.current = next;
      setZoom(next);
      schedule();
    },
    [schedule],
  );

  /* --- keeping the geometry honest --------------------------------------- */

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    measure();
    const observer = new ResizeObserver(() => {
      measure();
      if (armedRef.current) schedule();
    });
    observer.observe(pane);
    return () => observer.disconnect();
  }, [measure, schedule]);

  /* The box only exists from this render onwards, so its properties can only be
     written now. Without the schedule() the first painted frame would sit at
     0,0 before the drag caught up. */
  useEffect(() => {
    if (!mounted) return;
    measure();
    schedule();
  }, [mounted, measure, schedule]);

  /* The panel scrolls under the box. left/top are measured from the pane, so a
     scroll moves the pane and nothing else has to change - except the cached
     rect this hook reads instead of measuring per frame. */
  useEffect(() => {
    if (!armed) return;
    const onScroll = () => {
      measure();
      schedule();
    };
    window.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [armed, measure, schedule]);

  /* While the box is up, the wheel is magnification. The toolbar buttons and
     the + / - keys do the same thing, so the wheel is a convenience and never
     the only way in. */
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || !armed) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(event.deltaY > 0 ? -1 : 1);
    };
    pane.addEventListener("wheel", onWheel, { passive: false });
    return () => pane.removeEventListener("wheel", onWheel);
  }, [armed, zoomBy]);

  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (lingerRef.current) window.clearTimeout(lingerRef.current);
    },
    [],
  );

  return {
    paneRef,
    loupeRef,
    armed,
    mounted,
    dragging,
    zoom,
    onGripDown,
    onGripMove,
    onGripUp,
    onGripClick,
    zoomBy,
    dismiss,
  };
}
