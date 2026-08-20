import { useEffect, useRef } from "react";
import { DUR, EASE, ScrollTrigger, gsap, prefersReducedMotion } from "../lib/motion";
import { formatNumber } from "../lib/utils";

/**
 * useCountUp — animates a number from 0 to `value` the first time it is seen.
 *
 * Writes to textContent instead of React state: a 60 fps counter through
 * setState would re-render the tree ~90 times per number. The DOM node is the
 * only thing that needs to change.
 */
export function useCountUp(value: number, suffix = "") {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const paint = (n: number) => {
      el.textContent = formatNumber(n) + suffix;
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

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => tween.play(),
    });

    return () => {
      trigger.kill();
      tween.kill();
    };
  }, [value, suffix]);

  return ref;
}
