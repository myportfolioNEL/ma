import { useEffect, useRef } from "react";
import {
  initAnalytics,
  setDepth,
  setLocale,
  setSection,
  track,
  trackOnce,
  type Build,
} from "../lib/analytics";
import { crossedDepths } from "../lib/memory";
import { depthPercent, documentHeight } from "../lib/place";
import { currentScrollY, isScrollLocked } from "../lib/scroll";
import { observeVitals } from "../lib/vitals";

/**
 * useJourney - everything Google cannot see by itself.
 *
 * The tag in index.html already reports a page view, and enhanced measurement
 * adds scroll to 90%, outbound clicks and file downloads. None of that answers
 * the questions this site is actually about: which section held someone, where
 * exactly they stopped reading, how long they sat at that stop, whether they
 * came back to a place they had been before.
 *
 * So this hook reports the reading, not the loading:
 *
 *   section_view   the first time a section owns the middle of the screen
 *   section_time   how long it owned it, in milliseconds, when it loses it
 *   scroll_depth   10 / 25 / 50 / 75 / 90 / 100 percent, once each
 *   scroll_stop    the visitor stopped moving: which section, which offset,
 *                  which percentage, how long the previous stop lasted, and
 *                  which way they had been going. This is the event that
 *                  answers "where did the scrolling stop, and for how long".
 *   engagement     foreground milliseconds, deepest point reached
 *   web_vitals     LCP, CLS, INP, FCP, TTFB, long-task count
 *   js_error       anything thrown, with the file and line
 *   outbound_click / contact_click / language_change
 *
 * The section boundary is the same -45%/-45% band useActiveSection uses for the
 * navigation highlight, so the section named in a report is the section the
 * visitor saw highlighted. Two measurements that disagree are worse than one.
 */

export type Journey = {
  sections: readonly string[];
  build: Build;
  locale: string;
};

/** Movement must stop for this long before it counts as a stop. */
const STOP_MS = 500;

/** And the visitor must have travelled at least this far since the last one. */
const STOP_MOVE = 40;

/** The band that decides which section is being read. Matches useActiveSection. */
const BAND = "-45% 0px -45% 0px";

export function useJourney({ sections, build, locale }: Journey): void {
  const first = useRef(true);

  /* The tag is told who this is once, before anything else reports. */
  useEffect(() => {
    initAnalytics({
      build,
      locale,
      quality: document.documentElement.dataset.quality ?? "high",
    });
  }, [build, locale]);

  /* A language switch is a different reading of the same page, not a new one. */
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setLocale(locale);
    track("language_change", { locale, dir: document.documentElement.dir || "ltr" });
  }, [locale]);

  useEffect(() => {
    let live = true;

    /* --- which section is being read ----------------------------------- */

    let current = "";
    let enteredAt = Date.now();
    const seen = new Set<string>();

    const enter = (id: string): void => {
      if (id === current) return;

      if (current !== "") {
        track("section_time", { section: current, ms: Date.now() - enteredAt });
      }

      current = id;
      enteredAt = Date.now();
      setSection(id);

      if (id !== "") {
        seen.add(id);
        trackOnce("section_view", id, { section: id, order: seen.size });
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) enter(entry.target.id);
        }
      },
      { rootMargin: BAND, threshold: 0 },
    );

    for (const id of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    /* --- depth, and where the scrolling stopped ------------------------- */

    let deepest = 0;
    let lastY = currentScrollY();
    let lastStopY = lastY;
    let lastStopAt = Date.now();
    let stopTimer = 0;
    let frame = 0;

    const measure = (): void => {
      frame = 0;
      if (!live || isScrollLocked()) return;

      const y = currentScrollY();
      const percent = depthPercent(y);

      for (const mark of crossedDepths(deepest, percent)) {
        track("scroll_depth", { percent: mark, section: current });
      }
      if (percent > deepest) {
        deepest = percent;
        setDepth(percent);
      }

      const direction = y >= lastY ? "down" : "up";
      lastY = y;

      if (stopTimer !== 0) window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(() => {
        stopTimer = 0;
        if (!live) return;

        const travelled = Math.abs(y - lastStopY);
        if (travelled < STOP_MOVE) return;

        track("scroll_stop", {
          section: current,
          y,
          percent: depthPercent(y),
          direction,
          travelled: Math.round(travelled),
          /* How long the previous stop lasted: the reading time of a place. */
          dwell_ms: Date.now() - lastStopAt,
          doc: documentHeight(),
        });

        lastStopY = y;
        lastStopAt = Date.now();
      }, STOP_MS);
    };

    const onScroll = (): void => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    /* --- leaving, by link or by tab ------------------------------------- */

    const onClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = anchor.getAttribute("href") ?? "";
      const label = (anchor.textContent ?? "").trim();

      if (href.startsWith("mailto:") || href.startsWith("tel:")) {
        track("contact_click", { kind: href.slice(0, href.indexOf(":")), label });
        return;
      }

      let url: URL | null = null;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        url = null;
      }
      if (!url || url.host === window.location.host) return;

      track("outbound_click", {
        host: url.host,
        url: url.href,
        label,
        section: current,
        new_tab: anchor.target === "_blank",
      });
    };

    document.addEventListener("click", onClick, true);

    /* --- how long the page was actually in front of somebody ------------ */

    let foreground = Date.now();
    let engaged = 0;
    let reported = false;

    const bank = (): void => {
      if (document.visibilityState === "hidden") {
        engaged += Date.now() - foreground;
      } else {
        foreground = Date.now();
      }
    };

    const report = (): void => {
      if (reported) return;
      reported = true;

      const total = engaged + (document.visibilityState === "hidden" ? 0 : Date.now() - foreground);

      if (current !== "") {
        track("section_time", { section: current, ms: Date.now() - enteredAt }, true);
      }

      track(
        "engagement",
        {
          ms: total,
          max_depth: deepest,
          sections_seen: seen.size,
          last_section: current,
          last_y: currentScrollY(),
        },
        true,
      );
    };

    const onVisibility = (): void => {
      bank();
      if (document.visibilityState === "hidden") report();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", report);

    /* --- anything that breaks ------------------------------------------- */

    const onError = (event: ErrorEvent): void => {
      track("js_error", {
        message: event.message,
        source: `${event.filename ?? ""}:${event.lineno ?? 0}`,
        section: current,
      });
    };

    const onRejection = (event: PromiseRejectionEvent): void => {
      track("js_error", {
        message: String(event.reason).slice(0, 100),
        source: "promise",
        section: current,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    const stopVitals = observeVitals((vital) => {
      track("web_vitals", { metric: vital.name, value: vital.value }, true);
    });

    return () => {
      live = false;
      report();
      observer.disconnect();
      stopVitals();
      if (frame !== 0) window.cancelAnimationFrame(frame);
      if (stopTimer !== 0) window.clearTimeout(stopTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("pagehide", report);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onClick, true);
    };
  }, [sections, build]);
}
