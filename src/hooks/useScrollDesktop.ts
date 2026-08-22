import { useEffect } from "react";
import Lenis from "lenis";
import { ScrollTrigger, gsap, prefersReducedMotion } from "../lib/motion";
import { registerScrollEngine } from "../lib/scroll";
import { requestMeasure } from "../lib/measure";

/**
 * useScrollDesktop — smooth, but light.
 *
 * Mounted once, by AppDesktop. Never mounted on a phone.
 *
 * The settings are deliberate:
 *
 *   lerp: 0.24          Chase mode, not duration mode. The page tracks the
 *                       wheel instead of playing a fixed animation after it.
 *                       0.1 is Lenis's default and reads as heavy; 0.24 keeps
 *                       the softness and removes roughly two-thirds of the tail.
 *   NO duration/easing  Passing either one silently switches Lenis back into
 *                       timed mode and undoes the line above. This is the
 *                       single most common cause of "smooth but sluggish".
 *   wheelMultiplier     1.3 — slightly more distance per notch, which is what
 *                       "faster" actually means to a person using a wheel.
 *   syncTouch: false    A desktop build should never intercept touch. If this
 *                       machine also has a touchscreen, the finger gets the
 *                       platform's own scrolling.
 *   autoRaf: false      GSAP's ticker drives it, so the site keeps exactly one
 *                       frame loop shared with ScrollTrigger.
 *
 * ScrollTrigger is also told to behave. limitCallbacks stops it from firing
 * enter/leave callbacks on every intermediate frame during a fast scroll, and
 * ignoreMobileResize stops a URL-bar height change from triggering a full,
 * layout-thrashing refresh.
 */
export function useScrollDesktop(): void {
  useEffect(() => {
    /* A restored mid-page scroll position before ScrollTrigger has measured
       anything is a reliable way to land in a broken layout. */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    ScrollTrigger.config({
      limitCallbacks: true,
      ignoreMobileResize: true,
      /* resize is back: ignoreMobileResize already absorbs URL-bar noise, and
         without it nothing re-measures after a window change. */
      autoRefreshEvents: "DOMContentLoaded,load,resize",
    });

    if (prefersReducedMotion()) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      /* 0.16 كان يترك 220ms من الحركة بعد أن يتوقّف إصبعك. 0.24 تترك 140ms:
         أقصر من زمن الردّ الذي يُلاحِظ، وأطول من أن يصير التمرير خشناً. */
      lerp: 0.24,
      smoothWheel: true,
      wheelMultiplier: 1.3,
      syncTouch: false,
      autoRaf: false,
      /* Hand nested scrollers back to the browser: the case-study overlay,
         code blocks, anything marked [data-lenis-prevent]. */
      prevent: (node: HTMLElement) =>
        node instanceof Element && node.closest("[data-lenis-prevent]") !== null,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    /* lagSmoothing(0) يمرّر فروق الزمن الحقيقية كما هي. إطار واحد ثقيل (مرشّح
       يُبنى، أو خطّ يصل) يصير عندها قفزة مرئية في كل حركة عاملة. بـ 500/33:
       أي إطار يتجاوز 500ms يُعامَل كأنّه 33ms، فتتباطأ الحركة بدل أن تقفز. */
    gsap.ticker.lagSmoothing(500, 33);

    const unregister = registerScrollEngine({
      /* Duration is given here and only here: a jump to a section is a
         deliberate animation, unlike a wheel gesture. */
      scrollTo: (top: number) => lenis.scrollTo(top, { duration: 0.6 }),
      /* Restoring a place is not an animation. `immediate` skips the easing -
         an eased restore reads as the page falling rather than as the page
         remembering - and `force` lets it through while Lenis is stopped,
         which it is for the frame an overlay takes to close. */
      jump: (top: number) => lenis.scrollTo(top, { immediate: true, force: true }),
      stop: () => lenis.stop(),
      start: () => lenis.start(),
      resize: () => lenis.resize(),
    });

    const remeasure = () => {
      lenis.resize();
      requestMeasure();
    };

    /* content-visibility:auto replaces an estimated section height with the
       real one while you scroll. A section that guessed 1000px and needs
       1240px moves every trigger below it by 240px, and no scroll or resize
       event announces that. Watch the height itself. */
    let lastHeight = document.body.scrollHeight;
    const heightWatch = new ResizeObserver(() => {
      const next = document.body.scrollHeight;
      if (Math.abs(next - lastHeight) < 24) return;
      lastHeight = next;
      remeasure();
    });
    heightWatch.observe(document.body);

    if (document.fonts?.ready) void document.fonts.ready.then(remeasure);
    window.addEventListener("orientationchange", remeasure);
    window.addEventListener("load", remeasure);

    return () => {
      heightWatch.disconnect();
      window.removeEventListener("orientationchange", remeasure);
      window.removeEventListener("load", remeasure);
      unregister();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
}
