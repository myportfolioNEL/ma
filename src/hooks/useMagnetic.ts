import { useEffect, useRef } from "react";
import { EASE, gsap, prefersReducedMotion } from "../lib/motion";
import { isFinePointer, onPointerMove } from "../lib/pointer";

/**
 * useMagnetic — an element that leans toward the pointer, then springs back.
 *
 * Implementation notes:
 *  - It subscribes to the shared pointer (lib/pointer.ts) only while the
 *    pointer is actually over the element, and unsubscribes on the way out.
 *    Four magnetic buttons therefore add zero permanent move listeners
 *    instead of four handlers competing on every event.
 *  - The element's box is measured once on entry and reused, so the effect
 *    never reads layout inside the move handler.
 *  - quickTo() creates the tween once and then only feeds it numbers. Calling
 *    gsap.to() on every move would allocate a tween per frame.
 *  - Only runs on a fine pointer. On touch there is no hover, so there is no
 *    reason to pay for any of it.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.28) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    if (!isFinePointer()) return;

    const moveX = gsap.quickTo(el, "x", { duration: 0.45, ease: EASE.soft });
    const moveY = gsap.quickTo(el, "y", { duration: 0.45, ease: EASE.soft });

    let unsubscribe: (() => void) | null = null;
    let centerX = 0;
    let centerY = 0;

    const onEnter = () => {
      if (unsubscribe) return;
      const rect = el.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      unsubscribe = onPointerMove((state) => {
        moveX((state.x - centerX) * strength);
        moveY((state.y - centerY) * strength);
      });
    };

    const onLeave = () => {
      unsubscribe?.();
      unsubscribe = null;
      moveX(0);
      moveY(0);
    };

    el.addEventListener("pointerenter", onEnter, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      onLeave();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(el);
    };
  }, [strength]);

  return ref;
}
