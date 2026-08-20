import { useEffect, useRef, useState } from "react";
import Button from "../components/ui/Button";
import { ArrowDown, ArrowUpRight } from "../components/ui/Icons";
import { useLocale } from "../context/LocaleContext";
import { profile } from "../data/profile";
import { useLiquidDrift } from "../hooks/useLiquidDrift";
import { DUR, EASE, STAGGER, gsap, prefersReducedMotion } from "../lib/motion";
import { scrollToId } from "../hooks/useSmoothScroll";
import LetterName from "./LetterName";

/**
 * Hero — desktop.
 *
 * Two systems want this name, and they are separated in time rather than
 * argued about:
 *
 *   1. The intro timeline owns .hero__name as a single block. It animates a
 *      clip and a lift, once, and then it is done forever.
 *   2. The letter engine owns the individual letters, and is switched on only
 *      after the intro reports that it has finished.
 *
 * Nothing here animates letter-spacing or font-variation-settings on a
 * timeline; the engine writes axes only when a quantised step changes, and
 * only for letters near the pointer. See hooks/useLetterEngine.ts.
 *
 * Drift is attached to inner wrappers, never to the element a timeline writes
 * to and never to a [data-reveal] element. The name and the lead have
 * different identities, so they float at different speeds and in different
 * directions — the hero is not one moving sheet.
 */

type Props = {
  /** True once the preloader is finished. */
  start: boolean;
};

export default function Hero({ start }: Props) {
  const { locale, t } = useLocale();
  const rootRef = useRef<HTMLElement | null>(null);
  const nameWrapRef = useRef<HTMLDivElement | null>(null);
  const [introDone, setIntroDone] = useState(false);

  /* Drift is disabled until the intro is over so the two never overlap. */
  const driftRef = useLiquidDrift<HTMLDivElement>({
    id: "hero-name",
    strength: 0.55,
    rotate: 0.4,
    ease: 0.08,
    swirl: 0.6,
    squash: 0.5,
    energyVar: true,
    enabled: start && introDone,
  });

  /* Its own identity: a different amplitude, lag and direction from the name. */
  const leadRef = useLiquidDrift<HTMLSpanElement>({
    id: "hero-lead",
    strength: 0.34,
    rotate: 0.2,
    swirl: 1.2,
    energyVar: true,
    enabled: start && introDone,
  });

  useEffect(() => {
    if (!start) return;
    const root = rootRef.current;
    const nameWrap = nameWrapRef.current;
    if (!root || !nameWrap) return;

    if (prefersReducedMotion()) {
      gsap.set(root.querySelectorAll("[data-hero]"), { opacity: 1, y: 0 });
      gsap.set(nameWrap, { clipPath: "none", opacity: 1, yPercent: 0 });
      setIntroDone(true);
      return;
    }

    const timeline = gsap.timeline({
      defaults: { ease: EASE.cover },
      onComplete: () => setIntroDone(true),
    });

    timeline
      .fromTo(
        nameWrap,
        { clipPath: "inset(0% 0% 100% 0%)", yPercent: 8, opacity: 0 },
        {
          clipPath: "inset(0% 0% -12% 0%)",
          yPercent: 0,
          opacity: 1,
          duration: DUR.hero,
        },
      )
      .fromTo(
        root.querySelectorAll("[data-hero]"),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: DUR.slow, stagger: STAGGER.item },
        "-=0.5",
      )
      /* The clip is only needed for the reveal; leaving it behind would clip
         letters that later lean out of the box. */
      .set(nameWrap, { clearProps: "clipPath" });

    return () => {
      timeline.kill();
    };
  }, [start]);

  return (
    <section className="hero" ref={rootRef} aria-label="Introduction">
      <div className="hero__grid">
        <div ref={driftRef} className="hero__float">
          <div ref={nameWrapRef} className="hero__namewrap">
            <LetterName
              key={locale}
              text={profile.name}
              id="hero-name"
              className="hero__name"
              enabled={start && introDone}
            />
          </div>
        </div>

        <p className="hero__role" data-hero>
          {t.profile.role}
        </p>

        <p className="hero__lead" data-hero>
          <span ref={leadRef} className="hero__leadfloat">
            {t.profile.heroLead}
          </span>
        </p>

        <div className="hero__actions" data-hero>
          <Button variant="primary" size="lg" onClick={() => scrollToId("work")}>
            {t.ui.ctaWork}
            <ArrowDown size={16} />
          </Button>
          <Button variant="line" size="lg" href={`mailto:${profile.email}`}>
            {profile.email}
            <ArrowUpRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}

