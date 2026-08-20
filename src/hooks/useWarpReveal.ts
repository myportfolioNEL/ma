import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { warpIn, warpPulse, type WarpHandle } from "../lib/warp";

/**
 * useWarpReveal — "arrive unresolved, settle on contact".
 *
 * Attach `ref` to a wrapper that owns nothing else. In this project that is
 * `.win__warp` on desktop and `.card__warp` on the phone: an element whose
 * only job is to hold a filter for less than a second and then be ordinary
 * again.
 *
 * Call `onInteract` from onPointerEnter and onFocus. It does two things:
 *   · if the entrance is still running, it accelerates it — your attention is
 *     what resolves the image;
 *   · if it has already finished, it sends one small ripple through the
 *     surface, subject to the pool, the cooldown and the device budget.
 */

type Options = {
  enabled?: boolean;
  /** Starting displacement in pixels. */
  from?: number;
  /** Seconds. */
  duration?: number;
  /** Seconds of delay after the element enters view, for a staggered arrival. */
  delay?: number;
  /** How early to start, relative to the viewport. */
  rootMargin?: string;
};

export function useWarpReveal<T extends HTMLElement>(options: Options = {}) {
  const {
    enabled = true,
    from = 18,
    duration = 0.5,
    delay = 0,
    /* Start BEFORE the element is on screen, not 12% after it has arrived.
       The entrance should be finishing as it enters, not starting. */
    rootMargin = "300px 0px 300px 0px",
  } = options;

  const ref = useRef<T | null>(null);
  const handleRef = useRef<WarpHandle | null>(null);
  const settledRef = useRef(false);

  /* Hidden before the first paint, so there is no flash of a finished window
     that then re-animates. Done in a layout effect rather than in CSS so that
     a JavaScript failure leaves the content visible instead of invisible. */
  useLayoutEffect(() => {
    if (!enabled) return;
    const element = ref.current;
    if (element) element.style.opacity = "0";
  }, [enabled]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!enabled) {
      element.style.opacity = "";
      settledRef.current = true;
      return;
    }

    let timer = 0;
    let failOpen = 0;

    const start = () => {
      handleRef.current = warpIn(element, {
        from,
        duration,
        onSettled: () => {
          settledRef.current = true;
          handleRef.current = null;
          /* Hand opacity back to the stylesheet. */
          element.style.opacity = "";
        },
      });
    };

    const begin = () => {
      if (delay > 0) timer = window.setTimeout(start, delay * 1000);
      else start();
    };

    /* FAIL OPEN. This hook hides the element until the entrance runs. If the
       entrance never runs - no filter budget left, a callback delivered late,
       a tab that was in the background while the element scrolled past - the
       content still has to appear. Losing the effect is acceptable. Leaving a
       hole in the page for seconds is not. */
    failOpen = window.setTimeout(
      () => {
        if (settledRef.current) return;
        settledRef.current = true;
        handleRef.current?.settle(6);
        handleRef.current = null;
        element.style.opacity = "";
      },
      1200 + delay * 1000,
    );

    /* Already on screen, or nearly: do not wait for an observer callback to be
       delivered. This is the case that made the first window feel late. */
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight * 1.25 && rect.bottom > -200) {
      begin();

      return () => {
        window.clearTimeout(timer);
        window.clearTimeout(failOpen);
        handleRef.current?.cancel();
        handleRef.current = null;
        element.style.opacity = "";
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        begin();
      },
      { rootMargin },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.clearTimeout(failOpen);
      handleRef.current?.cancel();
      handleRef.current = null;
      element.style.opacity = "";
    };
  }, [delay, duration, enabled, from, rootMargin]);

  const settle = useCallback((speed = 2.6) => {
    handleRef.current?.settle(speed);
  }, []);

  const pulse = useCallback(() => {
    const element = ref.current;
    if (element && settledRef.current) warpPulse(element);
  }, []);

  /** The one handler a component needs: contact. */
  const onInteract = useCallback(() => {
    if (handleRef.current) {
      handleRef.current.settle(2.6);
      return;
    }
    pulse();
  }, [pulse]);

  return { ref, onInteract, settle, pulse };
}
