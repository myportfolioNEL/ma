import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  GLASS_NUDGE,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_REST,
  clampTo,
  inside,
  mirrorShift,
  round,
  stepZoom,
  toBox,
  type Point,
} from "../lib/reader";
import { clearEcho, cloneSelectionRanges, paintEcho } from "../lib/echo";

/**
 * useReader - one magnifier over a page that is drawn at printed size.
 *
 * THE BUG THIS FILE EXISTS TO FIX. v3 called setPointerCapture on the glass and
 * then guarded every move with `event.currentTarget.hasPointerCapture(...)` on
 * the PANEL. The panel never held the capture, so the guard rejected every
 * move and the glass could not be dragged one pixel. Pointer capture also
 * retargets later events to the capturing element, so the moves were being
 * delivered to an element that had no move handler at all.
 *
 *   RULE: the element that calls setPointerCapture is the element that carries
 *   onPointerMove, onPointerUp and onPointerCancel. Same element. Always.
 *
 * In v4 that element is the glass, and nothing else in the tree listens for a
 * drag.
 *
 * TWO WAYS TO MOVE IT, ONE FOR EACH KIND OF POINTER.
 *   fine (mouse, pen): the glass is `pointer-events: none` and simply follows
 *     the cursor over the stage. There is nothing to grab, nothing to press,
 *     and text under the glass stays selectable.
 *   coarse (finger): the glass is a real target and is dragged, with capture
 *     and handlers on the glass itself.
 *
 * THE PAGE IS AT SCALE 1. No fit factor, no transform on the sheet - it is laid
 * out at a readable width and the stage scrolls. The glass is a sibling of the
 * stage, positioned in PANEL coordinates, so scrolling slides the page beneath
 * a glass that stays where it was put, exactly like a real loupe on paper.
 *
 * WHAT IT WRITES, AND WHY IT IS CSS AND NOT STATE.
 *   glass  : --lp-size  --lp-x  --lp-y   data-over  data-dragging
 *   mirror : --lp-w  --lp-z  --lp-tx  --lp-ty
 * A move writes two custom properties on one composited element. React is not
 * involved: no state, no re-render, no reconciliation of a 30,000-character
 * clone at 120 Hz.
 */

type Options = {
  /** Diameter of the glass in CSS pixels: GLASS_DESKTOP or GLASS_MOBILE. */
  size: number;
  /** Which document is on the stage. Changing it rebuilds the clone. */
  docKey: string;
};

/** A tap shorter than this many pixels of travel is a tap, not a drag. */
const SLOP = 4;
/** Two taps inside this many milliseconds cycle the magnification. */
const DOUBLE_TAP = 340;

export function useReader({ size, docKey }: Options) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLElement | null>(null);
  const glassRef = useRef<HTMLDivElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(ZOOM_REST);
  const [dragging, setDragging] = useState(false);

  /* Mirrors of the above. The pointer path must never read React state. */
  const openValue = useRef(false);
  const zoomValue = useRef(ZOOM_REST);
  const dragValue = useRef(false);
  const centre = useRef<Point>({ x: 0, y: 0 });
  const grab = useRef<Point>({ x: 0, y: 0 });
  const parked = useRef(true);
  const lastTap = useRef(0);
  const travel = useRef(0);
  const frame = useRef(0);

  /* ------------------------------------------------------------- painting */

  /** The only function in this hook that writes to the DOM. */
  const paint = useCallback(() => {
    frame.current = 0;
    const panel = panelRef.current;
    const paper = paperRef.current;
    const glass = glassRef.current;
    const mirror = mirrorRef.current;
    if (!panel || !paper || !glass || !mirror) return;

    const origin = panel.getBoundingClientRect();
    const page = toBox(paper.getBoundingClientRect(), origin);
    const point = centre.current;
    const z = zoomValue.current;

    glass.style.setProperty("--lp-size", `${size}px`);
    glass.style.setProperty("--lp-x", `${round(point.x - size / 2)}px`);
    glass.style.setProperty("--lp-y", `${round(point.y - size / 2)}px`);
    glass.dataset.over =
      !parked.current && inside(point, page, size / 3) ? "true" : "false";

    /* LAYOUT width, never the painted width: the clone has to break its lines
       exactly where the page breaks them, or the glass shows a different
       document from the one underneath it. */
    mirror.style.setProperty("--lp-w", `${round(paper.offsetWidth)}px`);
    mirror.style.setProperty("--lp-z", String(z));
    mirror.style.setProperty(
      "--lp-tx",
      `${mirrorShift(point.x, page.x, size, z)}px`,
    );
    mirror.style.setProperty(
      "--lp-ty",
      `${mirrorShift(point.y, page.y, size, z)}px`,
    );
  }, [size]);

  /** Coalesce every source of movement into one frame. */
  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = window.requestAnimationFrame(paint);
  }, [paint]);

  /** Put the centre of the glass somewhere, in panel coordinates. */
  const place = useCallback(
    (point: Point) => {
      const panel = panelRef.current;
      const stage = stageRef.current;
      if (!panel || !stage) return;
      const origin = panel.getBoundingClientRect();
      centre.current = clampTo(point, toBox(stage.getBoundingClientRect(), origin));
      parked.current = false;
      schedule();
    },
    [schedule],
  );

  /* ------------------------------------------------------- selection echo */

  /** Re-project the live selection onto the clone. Cheap; runs on selectionchange. */
  const echo = useCallback(() => {
    const paper = paperRef.current;
    const mirror = mirrorRef.current;
    if (!openValue.current || !paper || !mirror) {
      clearEcho();
      return;
    }
    const clone = mirror.firstElementChild;
    if (!clone) {
      clearEcho();
      return;
    }
    paintEcho(cloneSelectionRanges(window.getSelection(), paper, clone));
  }, []);

  /** Rebuild the clone. On open and on document change - never during a drag. */
  const sync = useCallback(() => {
    const paper = paperRef.current;
    const mirror = mirrorRef.current;
    if (!paper || !mirror) return;
    const copy = paper.cloneNode(true) as HTMLElement;
    copy.setAttribute("aria-hidden", "true");
    copy.removeAttribute("id");
    copy.dataset.clone = "true";
    copy.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    mirror.replaceChildren(copy);
    echo();
    schedule();
  }, [echo, schedule]);

  /* ------------------------------------------------------------- commands */

  const toggle = useCallback(() => {
    const next = !openValue.current;
    openValue.current = next;
    setOpen(next);
    if (!next) {
      dragValue.current = false;
      setDragging(false);
      clearEcho();
      return;
    }
    /* Opened from a button, so there is no pointer to follow yet: park it in
       the middle of what is on screen and show it there. */
    const panel = panelRef.current;
    const stage = stageRef.current;
    if (!panel || !stage) return;
    const origin = panel.getBoundingClientRect();
    const box = toBox(stage.getBoundingClientRect(), origin);
    centre.current = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    parked.current = false;
  }, []);

  const zoomBy = useCallback(
    (direction: number) => {
      const next = stepZoom(zoomValue.current, direction);
      if (next === zoomValue.current) return;
      zoomValue.current = next;
      setZoom(next);
      schedule();
    },
    [schedule],
  );

  /** Finger shortcut: tap the glass twice to walk the magnification up. */
  const cycleZoom = useCallback(() => {
    const next = zoomValue.current + 1 > ZOOM_MAX ? ZOOM_MIN : zoomValue.current + 1;
    zoomValue.current = round(next);
    setZoom(zoomValue.current);
    schedule();
  }, [schedule]);

  /* ------------------------------------------- fine pointer: simply follow */

  const follow = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!openValue.current) return;
      if (event.pointerType === "touch") return;
      const panel = panelRef.current;
      if (!panel) return;
      const origin = panel.getBoundingClientRect();
      place({ x: event.clientX - origin.left, y: event.clientY - origin.top });
    },
    [place],
  );

  /** Cursor left the stage: take the glass off the page rather than freeze it. */
  const leave = useCallback(() => {
    if (!openValue.current || dragValue.current) return;
    parked.current = true;
    schedule();
  }, [schedule]);

  /* ------------------------------------------------ coarse pointer: a drag */

  const grabDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    /* A mouse never grabs the glass - it is already wearing it. */
    if (event.pointerType === "mouse") return;
    const glass = glassRef.current;
    const panel = panelRef.current;
    if (!glass || !panel) return;

    const origin = panel.getBoundingClientRect();
    grab.current = {
      x: centre.current.x - (event.clientX - origin.left),
      y: centre.current.y - (event.clientY - origin.top),
    };
    travel.current = 0;
    dragValue.current = true;
    setDragging(true);

    /* CAPTURE AND HANDLERS ON THE SAME ELEMENT. See the note at the top. */
    glass.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const grabMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragValue.current) return;
      const glass = glassRef.current;
      const panel = panelRef.current;
      if (!glass || !panel) return;
      if (!glass.hasPointerCapture?.(event.pointerId)) return;

      const origin = panel.getBoundingClientRect();
      const next = {
        x: event.clientX - origin.left + grab.current.x,
        y: event.clientY - origin.top + grab.current.y,
      };
      travel.current +=
        Math.abs(next.x - centre.current.x) + Math.abs(next.y - centre.current.y);
      place(next);
      event.preventDefault();
    },
    [place],
  );

  const grabUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const glass = glassRef.current;
      if (glass?.hasPointerCapture?.(event.pointerId)) {
        glass.releasePointerCapture(event.pointerId);
      }
      if (!dragValue.current) return;
      dragValue.current = false;
      setDragging(false);

      if (travel.current > SLOP) return;
      const now = event.timeStamp || Date.now();
      if (now - lastTap.current < DOUBLE_TAP) {
        lastTap.current = 0;
        cycleZoom();
      } else {
        lastTap.current = now;
      }
    },
    [cycleZoom],
  );

  /* --------------------------------------------------------------- keys */

  /** Move the stage. The panel holds focus, so the keys arrive here, not there. */
  const scrollStage = useCallback((amount: number | "home" | "end") => {
    const stage = stageRef.current;
    if (!stage) return;
    if (amount === "home") stage.scrollTo({ top: 0 });
    else if (amount === "end") stage.scrollTo({ top: stage.scrollHeight });
    else stage.scrollBy({ top: amount });
  }, []);

  /** Mounted on the panel by the view. Escape is the view's business. */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      const page = Math.max(160, (stage?.clientHeight ?? 640) - 96);

      /* Reading the document comes first, and it has to work with the glass
         away - which is why none of this is behind `if (!open) return`. */
      const paging = new Map<string, number | "home" | "end">([
        ["PageDown", page],
        ["PageUp", -page],
        [" ", page],
        ["Home", "home"],
        ["End", "end"],
      ]);
      const jump = paging.get(event.key);
      if (jump !== undefined) {
        event.preventDefault();
        scrollStage(jump);
        return;
      }

      const step: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const move = step[event.key];

      /* One key, the obvious meaning in both states: an arrow nudges the glass
         while it is out, and scrolls the page while it is away. */
      if (move) {
        event.preventDefault();
        if (!openValue.current) {
          scrollStage(move[1] * GLASS_NUDGE * 3);
          return;
        }
        place({
          x: centre.current.x + move[0] * GLASS_NUDGE,
          y: centre.current.y + move[1] * GLASS_NUDGE,
        });
        return;
      }

      if (!openValue.current) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(1);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(-1);
      }
    },
    [place, scrollStage, zoomBy],
  );

  /* ------------------------------------------------------------- effects */

  /* Open and close. */
  useEffect(() => {
    if (!open) {
      mirrorRef.current?.replaceChildren();
      clearEcho();
      return;
    }
    sync();
  }, [open, sync]);

  /* A different document while the glass is open. */
  useEffect(() => {
    if (!open) return;
    sync();
  }, [docKey, open, sync]);

  /* The page slides under a stationary glass, so scrolling has to repaint. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!open || !stage) return;
    const onScroll = () => schedule();
    stage.addEventListener("scroll", onScroll, { passive: true });
    return () => stage.removeEventListener("scroll", onScroll);
  }, [open, schedule]);

  /* The window can be resized while the reader is open. */
  useEffect(() => {
    const paper = paperRef.current;
    if (!open || !paper || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => schedule());
    observer.observe(paper);
    return () => observer.disconnect();
  }, [open, schedule]);

  /* Keep the highlight inside the glass in step with the real selection. */
  useEffect(() => {
    if (!open) return;
    const onSelect = () => echo();
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, [echo, open]);

  /*
   * THE WHEEL. This is the effect that makes the window scroll at all, and the
   * load-bearing line is stopPropagation, not preventDefault.
   *
   * Lenis listens for wheel on the window. Opening any overlay calls
   * setScrollLocked(true), which calls engine.stop() (lib/scroll.ts), and a
   * STOPPED Lenis does not ignore the wheel: it answers every wheel event it
   * receives with preventDefault() unless the event's path contains a
   * [data-lenis-prevent] element. A cancelled wheel event scrolls nothing at
   * all - not the page, not the box under the cursor. That is why this window
   * had a scrollbar that only worked when it was dragged by hand.
   *
   * Two independent guards, because one of them silently regressing is what
   * cost the last round: the attribute on the stage in both views, and this
   * listener, which stops the event before it can ever reach Lenis.
   *
   * It is NOT gated on `open`: the document must scroll whether or not the
   * magnifier is out.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.stopPropagation();
      if (!event.ctrlKey && !event.metaKey) return;
      if (!openValue.current) return;
      /* Pinch-zoom gesture: magnify the glass instead of the browser. */
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1 : -1);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  useEffect(
    () => () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
      clearEcho();
    },
    [],
  );

  return {
    panelRef,
    stageRef,
    paperRef,
    glassRef,
    mirrorRef,
    open,
    zoom,
    dragging,
    toggle,
    follow,
    leave,
    grabDown,
    grabMove,
    grabUp,
    onKeyDown,
  };
}

export type Reader = ReturnType<typeof useReader>;
