/**
 * lib/vitals.ts - what the browser already measured, read without a library.
 *
 * web-vitals is 2KB and a dependency. Everything below is one PerformanceObserver
 * per metric and a finalise pass, which is what that library is. No npm entry
 * is added for it, because this repository's build is audited and every new
 * dependency is a new way for CI to fail.
 *
 * Each observer is wrapped: Safari does not know `event`, older engines do not
 * know `layout-shift`, and an unknown type throws rather than returning null.
 * A missing metric is a missing metric, never a broken page.
 *
 * Nothing is reported while the page is being read. Values are held and sent
 * once, when the page is hidden or unloaded, because LCP and CLS are only true
 * at the end.
 */

export type VitalName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB" | "LONGTASK";

export type Vital = { name: VitalName; value: number };

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

type EventTimingEntry = PerformanceEntry & {
  duration: number;
  interactionId?: number;
};

type PaintEntry = PerformanceEntry & { startTime: number };

function observe(
  init: Record<string, unknown>,
  handler: (entries: PerformanceEntryList) => void,
): PerformanceObserver | null {
  if (typeof PerformanceObserver === "undefined") return null;
  try {
    const observer = new PerformanceObserver((list) => handler(list.getEntries()));
    observer.observe(init as PerformanceObserverInit);
    return observer;
  } catch {
    return null;
  }
}

function navigationTiming(): number {
  try {
    const entries = performance.getEntriesByType("navigation");
    const first = entries[0] as PerformanceNavigationTiming | undefined;
    return first ? Math.round(first.responseStart) : 0;
  } catch {
    return 0;
  }
}

/**
 * Starts watching. `report` is called once per metric, at the end of the page's
 * life. Returns a teardown that also forces the final report.
 */
export function observeVitals(report: (vital: Vital) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  let lcp = 0;
  let cls = 0;
  let inp = 0;
  let fcp = 0;
  let longTasks = 0;
  let done = false;

  const observers: Array<PerformanceObserver | null> = [
    observe({ type: "largest-contentful-paint", buffered: true }, (entries) => {
      for (const entry of entries) lcp = Math.max(lcp, Math.round(entry.startTime));
    }),

    observe({ type: "layout-shift", buffered: true }, (entries) => {
      for (const entry of entries as LayoutShiftEntry[]) {
        if (entry.hadRecentInput) continue;
        cls += entry.value;
      }
    }),

    /* Interaction to Next Paint, near enough: the slowest interaction the
       browser actually painted. durationThreshold keeps the callback quiet. */
    observe({ type: "event", buffered: true, durationThreshold: 40 }, (entries) => {
      for (const entry of entries as EventTimingEntry[]) {
        if (entry.interactionId === undefined || entry.interactionId === 0) continue;
        inp = Math.max(inp, Math.round(entry.duration));
      }
    }),

    observe({ type: "paint", buffered: true }, (entries) => {
      for (const entry of entries as PaintEntry[]) {
        if (entry.name === "first-contentful-paint") fcp = Math.round(entry.startTime);
      }
    }),

    observe({ type: "longtask", buffered: true }, (entries) => {
      longTasks += entries.length;
    }),
  ];

  const finish = (): void => {
    if (done) return;
    done = true;

    for (const observer of observers) {
      try {
        observer?.takeRecords();
        observer?.disconnect();
      } catch {
        /* ignore */
      }
    }

    if (fcp > 0) report({ name: "FCP", value: fcp });
    if (lcp > 0) report({ name: "LCP", value: lcp });
    if (inp > 0) report({ name: "INP", value: inp });
    report({ name: "CLS", value: Math.round(cls * 1000) / 1000 });
    if (longTasks > 0) report({ name: "LONGTASK", value: longTasks });

    const ttfb = navigationTiming();
    if (ttfb > 0) report({ name: "TTFB", value: ttfb });
  };

  const onHidden = (): void => {
    if (document.visibilityState === "hidden") finish();
  };

  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", finish);

  return () => {
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("pagehide", finish);
    finish();
  };
}
