import { useCallback, useEffect, useRef } from "react";
import { bumpEnergy, registerEnergy } from "../lib/energy";

/**
 * useFieldEnergy — the React face of lib/energy.ts.
 *
 * Attach `ref` to the element that should feel the field. Call `bump()` from
 * a hover, a focus or a press when you want that element to react instantly
 * instead of waiting for the field to reach it.
 *
 * The element receives one custom property, --e, between 0 and 1. Everything
 * visual is decided in CSS from that number: border colour, radius, tint,
 * the size of the glow. No inline styles, no class toggling, no re-render —
 * this hook never calls setState, so a button lighting up does not cost React
 * anything at all.
 */

type Options = {
  enabled?: boolean;
  /** Pixels around the element's box that still count as "near". */
  radius?: number;
  /** Quantisation step for --e. Bigger step, fewer repaints. */
  step?: number;
};

export function useFieldEnergy<T extends HTMLElement>(options: Options = {}) {
  const { enabled = true, radius, step } = options;
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    return registerEnergy(el, { radius, step });
  }, [enabled, radius, step]);

  const bump = useCallback((amount = 0.65) => {
    const el = ref.current;
    if (el) bumpEnergy(el, amount);
  }, []);

  return { ref, bump };
}
