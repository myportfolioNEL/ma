import { useEffect } from "react";
import { ScrollTrigger, prefersReducedMotion } from "../lib/motion";
import { requestMeasure } from "../lib/measure";

/**
 * useScrollMobile — the platform's own scrolling, kept honest.
 *
 * Mounted once, by AppMobile. There is no Lenis here and there must never be
 * one: native touch scrolling is composited, the JavaScript kind is not.
 *
 * What this hook still has to do:
 *   · stop the browser restoring a stale scroll position before anything is
 *     measured;
 *   · tell ScrollTrigger to use its cheap callback mode and to ignore the
 *     resize that fires every time the mobile URL bar collapses — without
 *     that flag, every scroll direction change costs a full refresh;
 *   · re-measure once when the webfont lands and once on rotation, because
 *     both change every line box on the page.
 *
 * Anchor jumps are handled in lib/scroll.ts with window.scrollTo({behavior})
 * plus the scroll-padding-top set in STEP 16, so a section never lands under
 * the top bar.
 */
export function useScrollMobile(): void {
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    ScrollTrigger.config({
      limitCallbacks: true,
      ignoreMobileResize: true,
      /* بلا visibilitychange: العودة إلى التبويب لا تُغيّر حجم شيء، وإعادة
         قياس كاملة في تلك اللحظة تعني قراءة هندسية لكل مُطلِق قبل أوّل إطار.
         الخطوط والدوران والتحميل تمرّ أصلاً عبر lib/measure.ts. */
      autoRefreshEvents: "DOMContentLoaded,load",
    });

    if (prefersReducedMotion()) {
      ScrollTrigger.refresh();
      return;
    }

    const remeasure = () => {
      requestMeasure();
    };

    if (document.fonts?.ready) void document.fonts.ready.then(remeasure);
    window.addEventListener("orientationchange", remeasure);
    window.addEventListener("load", remeasure);

    return () => {
      window.removeEventListener("orientationchange", remeasure);
      window.removeEventListener("load", remeasure);
    };
  }, []);
}
