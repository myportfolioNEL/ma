import { useSyncExternalStore } from "react";

/**
 * platform.ts — one decision, made once, read everywhere.
 *
 * The site ships two front ends. This file is the switch between them, and it
 * is deliberately the only switch: no component is allowed to ask "is this a
 * phone?" on its own. When the answer lives in one place, the two builds can
 * never disagree about which one is running, and there is exactly one line to
 * change if the breakpoint ever moves.
 *
 * The query is width OR coarse pointer, not width alone. A 1024px tablet held
 * in two hands is a touch device and wants the touch build; a 900px window on
 * a laptop still has a mouse and wants the desktop build. Asking about the
 * input device is more honest than asking about the number of pixels.
 */

export type Platform = "desktop" | "mobile";

export const MOBILE_QUERY =
  "(max-width: 860px), (pointer: coarse) and (max-width: 1024px)";

const supported = typeof window !== "undefined" && "matchMedia" in window;

let query: MediaQueryList | null = supported
  ? window.matchMedia(MOBILE_QUERY)
  : null;

let current: Platform = query?.matches ? "mobile" : "desktop";

const listeners = new Set<() => void>();

const publish = () => {
  const next: Platform = query?.matches ? "mobile" : "desktop";
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
};

if (query) {
  /* addEventListener on a MediaQueryList is not universal on older WebKit,
     which is exactly the browser most likely to be on the phone. */
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", publish);
  } else if (typeof query.addListener === "function") {
    query.addListener(publish);
  }
}

/** The current platform. Safe to call at module scope. */
export function getPlatform(): Platform {
  return current;
}

export function isMobile(): boolean {
  return current === "mobile";
}

export function isDesktop(): boolean {
  return current === "desktop";
}

/** Subscribe to platform changes. Returns an unsubscribe function. */
export function onPlatformChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const subscribe = (listener: () => void) => onPlatformChange(listener);
const snapshot = () => current;
const serverSnapshot = (): Platform => "desktop";

/**
 * React binding. useSyncExternalStore rather than useState + useEffect: the
 * first render already knows the answer, so the wrong build is never mounted
 * for one frame and then thrown away.
 */
export function usePlatform(): Platform {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
