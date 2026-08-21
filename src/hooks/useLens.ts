import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  LENS_NUDGE,
  LENS_REST,
  clampCentre,
  mirrorShift,
  overPaper,
  round,
  stepZoom,
  toBox,
} from "../lib/lens";
import type { Point } from "../lib/lens";

/**
 * useLens - a magnifying glass you can pick up, put down anywhere, and keep
 * using while the page scrolls underneath it.
 *
 * WHY A CLONE AND NOT A SECOND VIEWER. The lens holds a copy of the page made
 * with cloneNode(true) and scaled with a transform. Text stays vector at 5x, the
 * copy costs no network and no decode, and because it is re-aimed from the live
 * rectangle of the original on every frame, the page is free to scroll: the
 * previous version had to forbid scrolling to keep two PDF frames in step.
 *
 * WHY THE POSITION IS IN CSS CUSTOM PROPERTIES. Dragging writes six numbers on
 * two elements inside one requestAnimationFrame. React never re-renders during a
 * drag, and the only animated properties are translate and transform, which the
 * compositor owns.
 *
 * WHY THE PANEL IS THE COORDINATE SPACE. The lens is a child of the panel, not
 * of the scrolling stage, so it hovers over the window like glass instead of
 * scrolling away with the paper. Every measurement is physical (left/top), so
 * the same arithmetic serves Arabic and French with no sign flip.
 *
 * WHY IT IS ARMED, NOT ALWAYS ON. A magnifier that follows the pointer around
 * makes the page unreadable. Press the glass in the corner - or drag straight out
 * of it - and the lens appears; press it again and it is gone.
 */

export type Lens = ReturnType<typeof useLens>;

export function useLens({ size, docKey }: { size: number; docKey: string }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLElement | null>(null);
  const lensRef = useRef<HTMLDivElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(LENS_REST);
  const [dragging, setDragging] = useState(false);

  const openRef = useRef(false);
  const zoomRef = useRef(LENS_REST);
  const centre = useRef<Point>({ x: 0, y: 0 });
  const hold = useRef<Point | null>(null);
  const moved = useRef(false);
  const wasOpen = useRef(false);
  const frame = useRef(0);

  /* One rectangle read per element per frame, and six custom properties written.
     No layout is invalidated, because nothing here changes a used value that the
     rest of the panel depends on. */
  const paint = useCallback(() => {
    const lens = lensRef.current;
    const mirror = mirrorRef.current;
    const panel = panelRef.current;
    const stage = stageRef.current;
    const paper = paperRef.current;
    if (!lens || !mirror || !panel || !stage || !paper) return;

    const origin = panel.getBoundingClientRect();
    const stageBox = toBox(stage.getBoundingClientRect(), origin);
    const paperBox = toBox(paper.getBoundingClientRect(), origin);

    const point = clampCentre(centre.current, size, stageBox);
    centre.current = point;

    const shift = mirrorShift(point, paperBox, size, zoomRef.current);

    lens.style.setProperty("--lp-size", `${size}px`);
    lens.style.setProperty("--lp-x", `${round(point.x - size / 2)}px`);
    lens.style.setProperty("--lp-y", `${round(point.y - size / 2)}px`);
    lens.style.setProperty("--lp-z", `${zoomRef.current}`);
    /* The clone must be laid out at the width of the original or it would wrap
       differently and magnify the wrong words. */
    lens.style.setProperty("--lp-w", `${round(paperBox.w)}px`);
    mirror.style.setProperty("--lp-tx", `${shift.x}px`);
    mirror.style.setProperty("--lp-ty", `${shift.y}px`);
    lens.dataset.over = overPaper(point, paperBox) ? "true" : "false";
  }, [size]);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      paint();
    });
  }, [paint]);

  /* The copy is remade rather than kept in sync: the page is a few hundred
     static nodes, cloning it costs less than a millisecond, and a copy that is
     rebuilt cannot drift from the original. */
  const sync = useCallback(() => {
    const mirror = mirrorRef.current;
    const paper = paperRef.current;
    if (!mirror || !paper) return;
    const copy = paper.cloneNode(true) as HTMLElement;
    copy.setAttribute("aria-hidden", "true");
    copy.removeAttribute("id");
    mirror.replaceChildren(copy);
    paint();
  }, [paint]);

  const openLens = useCallback(() => {
    const panel = panelRef.current;
    const stage = stageRef.current;
    if (!panel || !stage) return;
    const origin = panel.getBoundingClientRect();
    const stageBox = toBox(stage.getBoundingClientRect(), origin);
    centre.current = { x: stageBox.x + stageBox.w / 2, y: stageBox.y + stageBox.h / 2 };
    openRef.current = true;
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    openRef.current = false;
    hold.current = null;
    setOpen(false);
    setDragging(false);
    mirrorRef.current?.replaceChildren();
  }, []);

  const zoomBy = useCallback(
    (steps: number) => {
      zoomRef.current = stepZoom(zoomRef.current, steps);
      setZoom(zoomRef.current);
      schedule();
    },
    [schedule],
  );

  const nudge = useCallback(
    (dx: number, dy: number) => {
      centre.current = {
        x: centre.current.x + dx * LENS_NUDGE,
        y: centre.current.y + dy * LENS_NUDGE,
      };
      schedule();
    },
    [schedule],
  );

  /* --- dragging the lens itself ------------------------------------------- */

  const startDrag = useCallback(
    (element: HTMLElement, pointerId: number, clientX: number, clientY: number, fromCentre: boolean) => {
      const panel = panelRef.current;
      if (!panel) return;
      element.setPointerCapture(pointerId);
      const origin = panel.getBoundingClientRect();
      hold.current = fromCentre
        ? {
            x: clientX - origin.left - centre.current.x,
            y: clientY - origin.top - centre.current.y,
          }
        : { x: 0, y: 0 };
      moved.current = false;
      setDragging(true);
    },
    [],
  );

  const onLensDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!openRef.current) return;
      /* preventDefault stops the browser from starting a text selection or a
         native drag while the finger is on the glass. */
      event.preventDefault();
      startDrag(event.currentTarget, event.pointerId, event.clientX, event.clientY, true);
    },
    [startDrag],
  );

  const onDragMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const grip = hold.current;
      const panel = panelRef.current;
      if (!grip || !panel) return;
      const origin = panel.getBoundingClientRect();
      const next = {
        x: event.clientX - origin.left - grip.x,
        y: event.clientY - origin.top - grip.y,
      };
      if (
        Math.abs(next.x - centre.current.x) > 3 ||
        Math.abs(next.y - centre.current.y) > 3
      ) {
        moved.current = true;
      }
      centre.current = next;
      schedule();
    },
    [schedule],
  );

  const onDragUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    hold.current = null;
    setDragging(false);
  }, []);

  /* --- the glass in the corner -------------------------------------------- */

  const onGripDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const panel = panelRef.current;
      if (!panel) return;
      event.preventDefault();
      wasOpen.current = openRef.current;
      if (!openRef.current) {
        const origin = panel.getBoundingClientRect();
        centre.current = { x: event.clientX - origin.left, y: event.clientY - origin.top };
        openRef.current = true;
        setOpen(true);
      }
      /* fromCentre: false - the lens takes the finger as its centre, so it can be
         dragged straight out of the button in one gesture. */
      startDrag(event.currentTarget, event.pointerId, event.clientX, event.clientY, false);
    },
    [startDrag],
  );

  /* A press that never moved is a tap: it toggles. A press that moved has
     already done its job by placing the lens. Keyboard activation arrives here
     with no pointer events before it, and opens the lens in the middle. */
  const onGripClick = useCallback(() => {
    if (moved.current) {
      moved.current = false;
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) {
      close();
    } else if (!openRef.current) {
      openLens();
    }
    wasOpen.current = false;
  }, [close, openLens]);

  /* --- effects ------------------------------------------------------------ */

  /* Build the copy when the lens opens and whenever the document changes
     language. The paper is a different element after a language switch, so the
     copy has to be made again, not adjusted. */
  useEffect(() => {
    if (!open) return;
    sync();
  }, [open, docKey, sync]);

  /* The page may scroll under the lens. Re-aim, do not close. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!open || !stage) return;
    const onScroll = () => schedule();
    stage.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      stage.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, schedule]);

  /* A width change rewraps the text, so the copy must be rebuilt, not shifted. */
  useEffect(() => {
    const paper = paperRef.current;
    if (!open || !paper || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => sync());
    observer.observe(paper);
    return () => observer.disconnect();
  }, [open, sync]);

  /* Wheel over the glass magnifies instead of scrolling the page behind it. */
  useEffect(() => {
    const lens = lensRef.current;
    if (!open || !lens) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1 : -1);
    };
    lens.addEventListener("wheel", onWheel, { passive: false });
    return () => lens.removeEventListener("wheel", onWheel);
  }, [open, zoomBy]);

  /* The keyboard can do everything the finger can: move the glass and change the
     magnification. Escape belongs to the window, which closes the lens first. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const step = (dx: number, dy: number) => {
        event.preventDefault();
        nudge(dx, dy);
      };
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(1);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(-1);
      } else if (event.key === "ArrowLeft") step(-1, 0);
      else if (event.key === "ArrowRight") step(1, 0);
      else if (event.key === "ArrowUp") step(0, -1);
      else if (event.key === "ArrowDown") step(0, 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, nudge, zoomBy]);

  useEffect(
    () => () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    },
    [],
  );

  return {
    panelRef,
    stageRef,
    paperRef,
    lensRef,
    mirrorRef,
    open,
    zoom,
    dragging,
    close,
    zoomBy,
    onLensDown,
    onDragMove,
    onDragUp,
    onGripDown,
    onGripClick,
  };
}
