import { useEffect, useRef } from "react";
import Button from "../components/ui/Button";
import { ArrowDown, ArrowUpRight } from "../components/ui/Icons";
import { useLocale } from "../context/LocaleContext";
import { profile } from "../data/profile";
import { scrollToId } from "../hooks/useSmoothScroll";
import { DUR, EASE, STAGGER, gsap, prefersReducedMotion } from "../lib/motion";
import LetterName from "./LetterName";

/**
 * Hero — phone.
 *
 * The name is split into letters here too, but it is driven differently. On a
 * phone the letters do not track anything: they are perfectly still until you
 * touch them, one wave travels out from the letter you touched, and then the
 * engine writes its resting values and unsubscribes. The expensive part of a
 * per-letter effect is the following, not the splitting — so the phone keeps
 * the typography and drops the tracking.
 */

type Props = {
  start: boolean;
};

export default function Hero({ start }: Props) {
  const { locale, t } = useLocale();
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!start) return;
    const root = rootRef.current;
    if (!root) return;

    const items = root.querySelectorAll("[data-hero]");

    if (prefersReducedMotion()) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    const tween = gsap.fromTo(
      items,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: DUR.slow,
        ease: EASE.out,
        stagger: STAGGER.item,
      },
    );

    return () => {
      tween.kill();
    };
  }, [start]);

  return (
    <section className="mhero" ref={rootRef} aria-label="Introduction">
      <p className="mhero__role" data-hero>
        {t.profile.role}
      </p>

      <div className="mhero__titlewrap" data-hero>
        <LetterName
          key={locale}
          text={profile.name}
          id="mhero-name"
          className="mhero__title display"
        />
      </div>

      <p className="mhero__lead" data-hero>
        {t.profile.heroLead}
      </p>

      <div className="mhero__cta" data-hero>
        <Button variant="primary" size="lg" onClick={() => scrollToId("work")}>
          {t.ui.ctaWork}
          <ArrowDown size={16} />
        </Button>
        <Button variant="line" size="lg" href={`mailto:${profile.email}`}>
          {t.ui.ctaContact}
          <ArrowUpRight size={16} />
        </Button>
      </div>
    </section>
  );
}

