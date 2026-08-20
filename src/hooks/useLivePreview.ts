import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PREVIEW_GRACE,
  PREVIEW_PARK_TTL,
  PREVIEW_TIMEOUT,
  canLivePreview,
  claimPreview,
  preconnectFor,
  previewSandbox,
  previewScale,
  releasePreview,
  type PreviewViewport,
} from "../lib/preview";

export type PreviewState = "idle" | "loading" | "live" | "failed";

type Options = {
  /** Unique per project per build, e.g. "pw-nl" or "pwm-nl". */
  id: string;
  /** The landing page to show. */
  src: string;
  /** The virtual viewport the site renders into. */
  viewport: PreviewViewport;
  /**
   * Visibility ratio that arms the preview by itself. 0 disables it, which is
   * what the desktop build wants: there, hover arms it. The phone build uses
   * 0.55, because a finger has no hover and "it is on screen" is the only
   * honest signal of intent.
   */
  autoMount?: number;
  enabled?: boolean;
};

/**
 * useLivePreview - one live site in one frame, and now: kept rather than
 * rebuilt.
 *
 * THREE STATES OF EXISTENCE, not two:
 *
 *   live    - mounted, visible, holds the single slot.
 *   parked  - mounted, loaded, hidden and inert. Does not hold the slot. Costs
 *             memory, costs no network and no boot. Dropped after
 *             PREVIEW_PARK_TTL unused, or as soon as the tab is hidden.
 *   idle    - not in the DOM at all.
 *
 * A frame is only ever parked if it actually reached "live". A frame that never
 * finished loading has nothing worth keeping, so it is discarded as before.
 */
export function useLivePreview<T extends HTMLElement>({
  id,
  src,
  viewport,
  autoMount = 0,
  enabled = true,
}: Options) {
  const boxRef = useRef<T | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<PreviewState>("idle");
  const [parked, setParked] = useState(false);

  /* Refs mirror the state that timers and observers read, so a callback never
     closes over a stale render. */
  const mountedRef = useRef(false);
  const failedRef = useRef(false);
  const liveRef = useRef(false);
  const parkedRef = useRef(false);
  const graceRef = useRef(0);
  const watchdogRef = useRef(0);
  const parkTimerRef = useRef(0);

  const sandbox = useMemo(
    () => (typeof window === "undefined" ? undefined : previewSandbox(src)),
    [src],
  );

  const clearTimers = useCallback(() => {
    if (graceRef.current) {
      window.clearTimeout(graceRef.current);
      graceRef.current = 0;
    }
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = 0;
    }
    if (parkTimerRef.current) {
      window.clearTimeout(parkTimerRef.current);
      parkTimerRef.current = 0;
    }
  }, []);

  const unmount = useCallback(
    (reason: "idle" | "failed") => {
      clearTimers();
      releasePreview(id);
      liveRef.current = false;
      parkedRef.current = false;
      setParked(false);
      if (!mountedRef.current) {
        if (reason === "failed") setState("failed");
        return;
      }
      mountedRef.current = false;
      setMounted(false);
      setState(reason === "failed" ? "failed" : "idle");
    },
    [clearTimers, id],
  );

  /**
   * Keep the document, lose the visibility. Called by lib/preview when another
   * window takes the slot, and by disarm() when the pointer has been gone for
   * the grace period.
   */
  const park = useCallback(() => {
    if (!mountedRef.current) return;

    /* Never park something that never loaded. */
    if (!liveRef.current) {
      unmount("idle");
      return;
    }

    if (graceRef.current) {
      window.clearTimeout(graceRef.current);
      graceRef.current = 0;
    }
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = 0;
    }

    /* A parked frame is not live, so it does not hold the slot. If park() was
       called by claimPreview itself this is already true and the call is a
       no-op. */
    releasePreview(id);

    parkedRef.current = true;
    setParked(true);

    if (parkTimerRef.current) window.clearTimeout(parkTimerRef.current);
    parkTimerRef.current = window.setTimeout(() => {
      parkTimerRef.current = 0;
      unmount("idle");
    }, PREVIEW_PARK_TTL);
  }, [id, unmount]);

  /** Hover, focus, or "you are the visible card". Idempotent. */
  const arm = useCallback(() => {
    if (!enabled || failedRef.current) return;

    /* A pointer that came back before the grace period ended keeps the frame
       it already had. */
    if (graceRef.current) {
      window.clearTimeout(graceRef.current);
      graceRef.current = 0;
    }

    /* THE CACHE HIT. The document is still here and still loaded: take the slot
       back, cancel its eviction, and show it. No network, no boot, no flash of
       the poster in between. */
    if (parkedRef.current) {
      if (parkTimerRef.current) {
        window.clearTimeout(parkTimerRef.current);
        parkTimerRef.current = 0;
      }
      claimPreview(id, () => unmount("idle"), park);
      parkedRef.current = false;
      setParked(false);
      return;
    }

    if (mountedRef.current) return;
    if (!canLivePreview()) return;

    preconnectFor(src);
    claimPreview(id, () => unmount("idle"), park);

    mountedRef.current = true;
    setMounted(true);
    setState("loading");

    watchdogRef.current = window.setTimeout(() => {
      watchdogRef.current = 0;
      failedRef.current = true;
      unmount("failed");
    }, PREVIEW_TIMEOUT);
  }, [enabled, id, park, src, unmount]);

  /** Pointer left, or the card left the screen. */
  const disarm = useCallback(() => {
    if (!mountedRef.current || parkedRef.current || graceRef.current) return;
    graceRef.current = window.setTimeout(() => {
      graceRef.current = 0;
      /* Loaded frames are parked, not destroyed. This is the whole difference
         between this version and the previous one. */
      if (liveRef.current) park();
      else unmount("idle");
    }, PREVIEW_GRACE);
  }, [park, unmount]);

  /**
   * The load event is not proof of success. A frame that the site refused to
   * be embedded in also fires load, on an empty about:blank document. A
   * cross-origin document that really loaded returns null for contentDocument,
   * which is the success case here. This is a heuristic and it is only ever
   * used to fall back to the screenshot - never to show the visitor an error.
   */
  const onFrameLoad = useCallback(() => {
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = 0;
    }

    let refused = false;
    try {
      const doc = frameRef.current?.contentDocument ?? null;
      if (doc) refused = !doc.body || doc.body.childElementCount === 0;
    } catch {
      refused = false;
    }

    if (refused) {
      failedRef.current = true;
      unmount("failed");
      return;
    }

    liveRef.current = true;
    setState("live");
  }, [unmount]);

  /* --- fitting the virtual viewport into the real box -------------------- */

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    box.style.setProperty("--pw-w", `${viewport.width}px`);
    box.style.setProperty("--pw-h", `${viewport.height}px`);

    let last = -1;
    const write = () => {
      const scale = previewScale(box.clientWidth, viewport);
      if (scale === last) return;
      last = scale;
      box.style.setProperty("--pw-scale", String(scale));
    };

    write();
    const observer = new ResizeObserver(write);
    observer.observe(box);
    return () => observer.disconnect();
  }, [viewport]);

  /* --- the phone path: visibility is the intent -------------------------- */

  useEffect(() => {
    if (!enabled || autoMount <= 0) return;
    const box = boxRef.current;
    if (!box) return;
    if (!canLivePreview()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.intersectionRatio >= autoMount) arm();
        else disarm();
      },
      { threshold: [0, autoMount, Math.min(autoMount + 0.2, 1)] },
    );

    observer.observe(box);
    return () => observer.disconnect();
  }, [arm, autoMount, disarm, enabled]);

  /* --- a hidden tab keeps nothing ---------------------------------------- */

  /* lib/preview evicts the frame that holds the slot when the tab is hidden. A
     parked frame does not hold the slot, so it needs this. Background tabs must
     not keep three browsing contexts alive on a phone. */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.hidden && parkedRef.current) unmount("idle");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [unmount]);

  /* --- teardown ---------------------------------------------------------- */

  useEffect(
    () => () => {
      clearTimers();
      releasePreview(id);
    },
    [clearTimers, id],
  );

  return {
    boxRef,
    frameRef,
    /** True when the iframe element should exist in the DOM. */
    mounted,
    state,
    /** True when the frame is loaded but hidden. Drives data-parked. */
    parked,
    sandbox,
    arm,
    disarm,
    onFrameLoad,
  };
}
