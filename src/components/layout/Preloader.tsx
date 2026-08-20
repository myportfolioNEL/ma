import { useEffect, useRef, useState } from "react";
import { profile } from "../../data/profile";
import { EASE, gsap, prefersReducedMotion } from "../../lib/motion";
import Loader from "../ui/Loader";

/**
 * Preloader — 1.1 seconds, then it leaves and never comes back.
 *
 * Its real job is not to hide loading; a Vite build is already fast. Its job is
 * to give the hero a starting line, so the name lands on a calm page instead of
 * fighting the browser's first paint. It unmounts completely when finished, so
 * it costs nothing afterwards.
 *
 * Under prefers-reduced-motion it renders nothing at all and reports done on
 * the first effect — the hero then appears in its final state.
 */
type PreloaderProps = {
  /** Called once, when the curtain has fully left the screen. */
  onDone: () => void;
};

export default function Preloader({ onDone }: PreloaderProps) {
  const [visible, setVisible] = useState(() => !prefersReducedMotion());

  const rootRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);

  // Keep the latest callback without making it an effect dependency: the
  // timeline must be created exactly once, whatever the parent re-renders.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (prefersReducedMotion()) {
      doneRef.current();
      return;
    }

    const root = rootRef.current;
    const fill = fillRef.current;
    const count = countRef.current;

    if (!root || !fill || !count) {
      doneRef.current();
      return;
    }

    // Block scrolling while the curtain is up.
    document.documentElement.classList.add("is-loading");

    // A plain object tweened by GSAP: the counter never triggers React.
    const value = { n: 0 };

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.classList.remove("is-loading");
        setVisible(false);
        doneRef.current();
      },
    });

    tl.set(fill, { scaleX: 0, transformOrigin: "left center" })
      .to(fill, { scaleX: 1, duration: 0.62, ease: "power2.inOut" }, 0)
      .to(
        value,
        {
          n: 100,
          duration: 0.62,
          ease: "power2.inOut",
          onUpdate: () => {
            count.textContent = String(Math.round(value.n)).padStart(3, "0");
          },
        },
        0,
      )
      .to(
        root,
        {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 0.48,
          ease: EASE.cover,
        },
        ">-0.06",
      );

    return () => {
      tl.kill();
      document.documentElement.classList.remove("is-loading");
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="preloader" ref={rootRef} aria-hidden="true">
      <div className="shell preloader__inner">
        <span className="preloader__name">{profile.name}</span>

        <span className="preloader__bar">
          <span className="preloader__fill" ref={fillRef} />
        </span>

        <span className="preloader__foot">
          <span className="preloader__wait" aria-hidden="true">
            <Loader size="sm" tone="on-royal" />
          </span>

          <span className="preloader__count mono" ref={countRef}>
            000
          </span>
        </span>
      </div>
    </div>
  );
}
