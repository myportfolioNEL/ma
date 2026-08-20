import { useEffect, useRef, useState } from "react";
import { WAIT_DELAY, WAIT_FLOOR } from "../lib/waiting";

/**
 * useWaiting - a boolean with manners.
 *
 * Give it the raw "still working" flag. It returns `show`, which:
 *   - stays false for the first WAIT_DELAY ms of work, so quick work is
 *     invisible;
 *   - once true, stays true for at least WAIT_FLOOR ms, so it can never blink;
 *   - goes false immediately if the work finished before the delay elapsed.
 *
 * Two timers, both cleared on unmount, and no state update after unmount.
 * There is no requestAnimationFrame here on purpose: this is a decision about
 * time, not about frames, and setTimeout does not keep the main thread awake.
 */
export function useWaiting(pending: boolean): boolean {
  const [show, setShow] = useState(false);

  /* When the loader actually became visible. 0 means "not visible". */
  const shownAtRef = useRef(0);
  const delayRef = useRef(0);
  const floorRef = useRef(0);

  useEffect(() => {
    const clearDelay = () => {
      if (delayRef.current) {
        window.clearTimeout(delayRef.current);
        delayRef.current = 0;
      }
    };
    const clearFloor = () => {
      if (floorRef.current) {
        window.clearTimeout(floorRef.current);
        floorRef.current = 0;
      }
    };

    if (pending) {
      clearFloor();
      if (show || delayRef.current) return;

      delayRef.current = window.setTimeout(() => {
        delayRef.current = 0;
        shownAtRef.current = Date.now();
        setShow(true);
      }, WAIT_DELAY);

      return clearDelay;
    }

    /* Work finished. */
    clearDelay();

    if (!show) return;

    const visibleFor = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, WAIT_FLOOR - visibleFor);

    if (remaining === 0) {
      shownAtRef.current = 0;
      setShow(false);
      return;
    }

    floorRef.current = window.setTimeout(() => {
      floorRef.current = 0;
      shownAtRef.current = 0;
      setShow(false);
    }, remaining);

    return clearFloor;
  }, [pending, show]);

  /* Belt and braces: an unmount mid-wait must not leave a timer holding a
     reference to this component's setState. */
  useEffect(
    () => () => {
      if (delayRef.current) window.clearTimeout(delayRef.current);
      if (floorRef.current) window.clearTimeout(floorRef.current);
    },
    [],
  );

  return show;
}
