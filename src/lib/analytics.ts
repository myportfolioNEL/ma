/**
 * lib/analytics.ts - the one road every measurement takes out of this site.
 *
 * The tag itself lives in index.html, exactly as Google wrote it, because a tag
 * that is mounted by React is a tag that misses everything before React boots
 * and everything that happens when React crashes. This file never installs it.
 * It only speaks to it.
 *
 * WHAT THIS BUYS OVER CALLING gtag() FROM COMPONENTS:
 *
 *  1. NOTHING IS LOST BEFORE THE TAG ANSWERS. An ad blocker, a slow network, a
 *     visitor who scrolls during the first 400ms: events are queued and sent
 *     when - if - the tag arrives, and dropped quietly after QUEUE_MAX so a
 *     blocked tag can never grow memory without bound.
 *
 *  2. EVERY EVENT CARRIES THE SAME CONTEXT. build, locale, quality tier,
 *     current section, current depth and visit number are attached in one
 *     place, so a report can slice any event by any of them without a
 *     component having remembered to pass it.
 *
 *  3. THE NAMES ARE A TYPE. AnalyticsEvent is a union: a typo is a build
 *     error, not a silent hole in a dashboard three weeks later.
 *
 *  4. GA4'S LIMITS ARE ENFORCED HERE. Names and values are trimmed to 100
 *     characters and a payload is capped at 24 parameters, because a hit over
 *     the limit is not truncated by Google, it is discarded.
 *
 * NO page_view IS EVER SENT FROM HERE. The config line in index.html already
 * sends one, and enhanced measurement adds scroll, outbound clicks, file
 * downloads and site search on top. Everything below is the part Google cannot
 * see by itself.
 */

import { openVisit, readMemory } from "./memory";

/** The stream this site reports to. Same id as the tag in index.html. */
export const GA_ID = "G-4LJMT1DZ69";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type Params = Record<string, string | number | boolean | null | undefined>;

export type Build = "desktop" | "mobile";

/** Every event this site is allowed to send. */
const EVENT_NAMES = [
  "app_start",
  "section_view",
  "section_time",
  "scroll_depth",
  "scroll_stop",
  "scroll_restore",
  "place_saved",
  "overlay_open",
  "overlay_close",
  "reader_zoom",
  "cv_download",
  "language_change",
  "outbound_click",
  "contact_click",
  "project_open",
  "engagement",
  "web_vitals",
  "js_error",
] as const;

export type AnalyticsEvent = (typeof EVENT_NAMES)[number];

export type Context = {
  build: Build;
  locale: string;
  quality: string;
  /** The section under the fold line right now. */
  section: string;
  /** How far down the page the visitor has been, as a percentage. */
  depth: number;
  visit_no: number;
  visitor: string;
};

/** GA4 discards a hit with more than 25 parameters. Leave one spare. */
const MAX_PARAMS = 24;
const MAX_TEXT = 100;
const QUEUE_MAX = 60;
const FLUSH_MS = 1200;
const FLUSH_TRIES = 12;

let context: Context = {
  build: "desktop",
  locale: "en",
  quality: "high",
  section: "",
  depth: 0,
  visit_no: 1,
  visitor: "",
};

let started = false;
let flushTimer = 0;
let tries = 0;

const queue: Array<{ name: AnalyticsEvent; params: Params }> = [];
const sent = new Set<string>();

function bridge(): ((...args: unknown[]) => void) | null {
  if (typeof window === "undefined") return null;
  return typeof window.gtag === "function" ? window.gtag : null;
}

/** True once the tag in index.html has defined gtag. */
export function analyticsLive(): boolean {
  return bridge() !== null;
}

/** A visitor can switch the site's own reporting off from the console. */
export function analyticsEnabled(): boolean {
  return readMemory<boolean>("analytics.off", false, "local") !== true;
}

function clean(params: Params): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  let count = 0;

  for (const [key, value] of Object.entries(params)) {
    if (count >= MAX_PARAMS) break;
    if (value === undefined || value === null || value === "") continue;

    if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      out[key] = Math.round(value * 1000) / 1000;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else {
      out[key] = value.length > MAX_TEXT ? value.slice(0, MAX_TEXT) : value;
    }
    count += 1;
  }

  return out;
}

function ambient(): Params {
  return {
    build: context.build,
    locale: context.locale,
    quality: context.quality,
    section: context.section,
    depth: context.depth,
    visit_no: context.visit_no,
  };
}

function schedule(): void {
  if (typeof window === "undefined") return;
  if (flushTimer !== 0 || queue.length === 0) return;
  if (tries >= FLUSH_TRIES) {
    queue.length = 0;
    return;
  }

  flushTimer = window.setTimeout(() => {
    flushTimer = 0;
    tries += 1;
    flushAnalytics();
    schedule();
  }, FLUSH_MS);
}

/** Sends whatever is waiting, if the tag is there to receive it. */
export function flushAnalytics(): void {
  const send = bridge();
  if (!send || queue.length === 0) return;

  const pending = queue.splice(0, queue.length);
  for (const item of pending) send("event", item.name, clean(item.params));
}

/**
 * Sends one event. Safe before the tag loads, safe if it never loads, safe on
 * a server. `final` marks the last events of a page life so the browser uses
 * sendBeacon rather than a request that a closing tab will cancel.
 */
export function track(
  name: AnalyticsEvent,
  params: Params = {},
  final = false,
): void {
  if (typeof window === "undefined" || !analyticsEnabled()) return;

  const payload: Params = { ...ambient(), ...params };
  if (final) payload.transport_type = "beacon";

  const send = bridge();
  if (!send) {
    if (queue.length < QUEUE_MAX) queue.push({ name, params: payload });
    schedule();
    return;
  }

  send("event", name, clean(payload));
}

/** Sends an event at most once per page life, per key. */
export function trackOnce(
  name: AnalyticsEvent,
  key: string,
  params: Params = {},
): void {
  const stamp = `${name}:${key}`;
  if (sent.has(stamp)) return;
  sent.add(stamp);
  track(name, params);
}

/**
 * Announces the visitor to the tag and drains anything queued during boot.
 * Calling it again only refreshes the context - the visit is counted once.
 */
export function initAnalytics(patch: Partial<Context> = {}): void {
  if (typeof window === "undefined") return;

  const visit = openVisit();
  context = { ...context, ...patch, visit_no: visit.visits, visitor: visit.id };

  const send = bridge();
  if (send) {
    send(
      "set",
      "user_properties",
      clean({
        build: context.build,
        locale: context.locale,
        quality: context.quality,
        visit_no: context.visit_no,
        returning: visit.visits > 1,
      }),
    );
  }

  if (!started) {
    started = true;
    track("app_start", {
      visitor: context.visitor,
      returning: visit.visits > 1,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio || 1,
      referrer: document.referrer ? new URL(document.referrer).host : "direct",
      tag_live: analyticsLive(),
    });
  }

  flushAnalytics();
  schedule();
}

/* --- context, kept current by the hooks --------------------------------- */

export function setSection(section: string): void {
  context.section = section;
}

export function setDepth(depth: number): void {
  if (depth > context.depth) context.depth = depth;
}

export function setLocale(locale: string): void {
  context.locale = locale;
  const send = bridge();
  if (send) send("set", "user_properties", clean({ locale }));
}

export function setQuality(quality: string): void {
  context.quality = quality;
}

/** For the console, and for the hand check in the prompt. */
export function analyticsContext(): Context {
  return { ...context };
}
