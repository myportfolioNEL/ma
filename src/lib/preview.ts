/**
 * preview.ts - policy for live site previews.
 *
 * A live preview is a real website running inside this page. That is not a
 * decoration, it is a second browsing context with its own JavaScript, its
 * own timers and its own memory. Everything expensive about that idea is
 * answered here, once, so that no component has to think about it:
 *
 *   1. ONE AT A TIME. claimPreview() evicts whoever held the slot before.
 *      Three windows on a page can never become three running sites.
 *   2. NOT ON A BAD CONNECTION. Save-Data, 2g and 3g, and low-memory devices
 *      never load a frame. They keep the screenshot, which is the whole point
 *      of the facade pattern: the fallback is not an error, it is the design.
 *   3. WARM THE ORIGIN BEFORE THE FRAME. A preconnect fired at hover-intent
 *      buys the DNS, TCP and TLS round trips before the src is even set.
 *   4. GIVE IT BACK. A hidden tab evicts the live frame immediately.
 *
 * The three sites are on GitHub Pages, which does not send X-Frame-Options,
 * so they embed. If that ever changes, nothing here throws: the hook times
 * out and the poster stays. See useLivePreview.
 */

export type PreviewViewport = {
  /** CSS pixels of the virtual window the site is rendered into. */
  width: number;
  height: number;
};

/**
 * Desktop frames render at a real desktop width and are then scaled down to
 * the pane. Rendering at the pane's own width would trigger the framed site's
 * mobile layout inside a desktop window, which is the wrong screenshot.
 */
export const PREVIEW_DESKTOP: PreviewViewport = { width: 1440, height: 900 };

/**
 * Phone frames render at a phone width on purpose, so the visitor sees the
 * site's real phone layout - not a shrunken desktop. This is the same rule
 * the rest of this project follows for its own two builds.
 */
export const PREVIEW_MOBILE: PreviewViewport = { width: 414, height: 896 };

/** Give up and keep the poster after this long. */
export const PREVIEW_TIMEOUT = 6000;

/** How long a frame survives after the pointer leaves, in case it comes back. */
export const PREVIEW_GRACE = 1100;

/**
 * How long a parked frame is kept in memory after it has lost the slot.
 *
 * PARKING is the third state this file always implied and nobody connected.
 * claimPreview() has accepted an optional park callback since it was written
 * (see below), and both stylesheets have styled .pw[data-parked="true"] since
 * the same commit - but useLivePreview never passed one, so a fully loaded
 * website was destroyed 1.1 s after the pointer left and downloaded again on
 * every return.
 *
 * A parked frame is hidden, inert, and still loaded: returning to that window
 * costs no network and no boot. It cannot be free forever - it is a whole
 * browsing context with its own timers - so it is dropped after this long
 * unused, and immediately if the tab is hidden.
 */
export const PREVIEW_PARK_TTL = 45000;

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

function networkInformation(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
}

/**
 * The gate. False means: never load a frame on this device, on this visit.
 * Called before every arm, not once at startup, because a connection can
 * change while the page is open.
 */
export function canLivePreview(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const connection = networkInformation();
  if (connection?.saveData === true) return false;

  const effective = connection?.effectiveType;
  if (effective === "slow-2g" || effective === "2g" || effective === "3g") {
    return false;
  }

  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  if (typeof memory === "number" && memory > 0 && memory < 4) return false;

  return true;
}

/**
 * Sandbox policy.
 *
 * allow-scripts together with allow-same-origin lets a framed document remove
 * its own sandbox attribute and reload - but only when it is same-origin with
 * the parent. Two of the three sites are on other origins, so they get the
 * sandbox. A same-origin frame gets no sandbox attribute at all, because in
 * that case the sandbox buys nothing and only breaks storage and fetch inside
 * a site that is already yours.
 */
export function previewSandbox(src: string): string | undefined {
  try {
    const url = new URL(src, window.location.href);
    if (url.origin === window.location.origin) return undefined;
    return "allow-scripts allow-same-origin allow-forms";
  } catch {
    return "allow-scripts";
  }
}

const warmedOrigins = new Set<string>();

/**
 * Fired on hover-intent, before the frame is created. One preconnect per
 * origin per page load; the Set makes a second call free.
 */
export function preconnectFor(src: string): void {
  if (typeof document === "undefined") return;
  let origin = "";
  try {
    origin = new URL(src, window.location.href).origin;
  } catch {
    return;
  }
  if (!origin || warmedOrigins.has(origin)) return;
  warmedOrigins.add(origin);

  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = origin;
  preconnect.crossOrigin = "anonymous";
  document.head.appendChild(preconnect);

  const dns = document.createElement("link");
  dns.rel = "dns-prefetch";
  dns.href = origin;
  document.head.appendChild(dns);
}

/* --- the single slot ----------------------------------------------------- */

type Holder = { id: string; evict: () => void; park?: () => void };

let holder: Holder | null = null;
let visibilityBound = false;

function bindVisibility(): void {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) evictPreview();
  });
}

/**
 * Take the slot. Whoever held it is evicted synchronously, before this
 * returns, so two frames never exist in the same frame of animation.
 */
export function claimPreview(
  id: string,
  evict: () => void,
  park?: () => void,
): void {
  bindVisibility();
  if (holder && holder.id !== id) {
    const previous = holder;
    holder = null;
    if (previous.park) {
      previous.park();
    } else {
      previous.evict();
    }
  }
  holder = { id, evict, park };
}

/** Give the slot back. Safe to call when you never had it. */
export function releasePreview(id: string): void {
  if (holder && holder.id === id) holder = null;
}

/** Drop whatever is live right now. Used by the hidden-tab handler. */
export function evictPreview(): void {
  const current = holder;
  holder = null;
  current?.evict();
}

/** Who owns the slot, for debugging only. */
export function previewHolder(): string | null {
  return holder ? holder.id : null;
}

/**
 * The scale that fits a virtual viewport into a real box, rounded to three
 * decimals so the value written into CSS is stable and does not churn the
 * compositor on every resize pixel.
 */
export function previewScale(
  boxWidth: number,
  viewport: PreviewViewport,
): number {
  if (boxWidth <= 0) return 1;
  return Math.round((boxWidth / viewport.width) * 1000) / 1000;
}
