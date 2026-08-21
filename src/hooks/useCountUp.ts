import { useEffect, useRef } from "react";
import { DUR, EASE, gsap, prefersReducedMotion } from "../lib/motion";
import { formatNumber } from "../lib/utils";

/**
 * useCountUp — animates a number from 0 to `value` the first time it is seen.
 *
 * Writes to textContent instead of React state: a 60 fps counter through
 * setState would re-render the tree ~90 times per number.
 *
 * The trigger is an IntersectionObserver, not a ScrollTrigger. This span sits
 * inside #numbers, which is content-visibility:auto, so at mount it has no
 * box to measure. A guard makes the failure mode "the number is correct"
 * rather than "the number is a permanent zero".
 */
export function useCountUp(value: number, suffix = "") {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const paint = (n: number): void => {
      element.textContent = formatNumber(n) + suffix;
    };

    if (prefersReducedMotion()) {
      paint(value);
      return;
    }

    paint(0);
    const counter = { n: 0 };

    const tween = gsap.to(counter, {
      n: value,
      duration: DUR.hero + 0.6,
      ease: EASE.soft,
      paused: true,
      onUpdate: () => paint(counter.n),
    });

    let started = false;

    const start = (): void => {
      if (started) return;
      started = true;
      observer.disconnect();
      window.clearTimeout(guard);
      tween.play();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );
    observer.observe(element);

    /* If the observer somehow never fires, a visible zero is a lie. Check the
       box once and, if it is on screen, run. */
    const guard = window.setTimeout(() => {
      const rect = element.getBoundingClientRect();
      if (rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
        start();
      }
    }, 2500);

    return () => {
      started = true;
      observer.disconnect();
      window.clearTimeout(guard);
      tween.kill();
    };
  }, [value, suffix]);

  return ref;
}
