import { useEffect, useState } from "react";
import { timeIn } from "../lib/utils";

/**
 * useUi.ts — the small observational hooks. Grouped in one file because each
 * is under 30 lines and they are always imported together.
 */

/** Subscribes to a media query. Returns false during the first paint on SSR. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * Tracks which section id is currently the closest to the top of the viewport.
 * IntersectionObserver only — no scroll listener, no layout thrash.
 */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/** Direction of travel + whether we are still at the top of the document. */
export function useScrollDirection(): { down: boolean; atTop: boolean } {
  const [state, setState] = useState({ down: false, atTop: true });

  useEffect(() => {
    let previous = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const current = window.scrollY;
        const delta = current - previous;
        if (Math.abs(delta) > 6) {
          setState({ down: delta > 0, atTop: current < 80 });
          previous = current;
        } else {
          setState((s) => ({ ...s, atTop: current < 80 }));
        }
        frame = 0;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return state;
}

/** Live "HH:MM" in the given time zone, updated every 30 seconds. */
export function useLocalClock(timeZone: string): string {
  const [value, setValue] = useState(() => timeIn(timeZone));

  useEffect(() => {
    const id = window.setInterval(() => setValue(timeIn(timeZone)), 30_000);
    return () => window.clearInterval(id);
  }, [timeZone]);

  return value;
}
