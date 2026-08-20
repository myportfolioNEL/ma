import { useEffect, useRef, useState } from "react";
import LangSwitch from "../components/ui/LangSwitch";
import { useLocale } from "../context/LocaleContext";
import { profile } from "../data/profile";
import { scrollToId } from "../hooks/useSmoothScroll";
import { useScrollDirection } from "../hooks/useUi";
import { subscribeLiquid } from "../lib/liquid";

/**
 * Header — desktop only.
 *
 * Two details worth naming. First, the scroll progress bar is written from the
 * shared liquid tick using the scroll value that loop already read, so this
 * component adds zero layout reads per frame. Second, the blur is static: it
 * is switched on once when the header leaves the top of the page and never
 * animated, because animating backdrop-filter forces a full-screen paint on
 * every frame and is the single most expensive thing a fixed header can do.
 */

type Props = {
  active: string;
};

export default function Header({ active }: Props) {
  const { t } = useLocale();
  const barRef = useRef<HTMLSpanElement | null>(null);
  const [solid, setSolid] = useState(false);
  const { down, atTop } = useScrollDirection();

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    return subscribeLiquid((tick) => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight || 1;
      const progress = Math.min(1, Math.max(0, tick.scrollY / max));
      bar.style.transform = `scaleX(${progress})`;
      setSolid(tick.scrollY > 24);
    });
  }, []);

  return (
    <header
      className="header"
      data-solid={solid ? "" : undefined}
      data-hidden={down && !atTop ? "" : undefined}
    >
      <button
        type="button"
        className="header__mark"
        onClick={() => scrollToId("hero")}
        aria-label={profile.name}
      >
        <img
          className="mark__face"
          src={profile.portraitUrl}
          alt=""
          width={28}
          height={28}
          decoding="async"
          fetchPriority="high"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
        <b>{profile.name}</b>
        <span>{profile.role}</span>
      </button>

      <nav className="header__nav" aria-label="Sections">
        {t.navItems.map((link) => (
          <button
            key={link.id}
            type="button"
            className="header__link"
            aria-current={active === link.id ? "true" : undefined}
            onClick={() => scrollToId(link.id)}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="header__meta">
        <LangSwitch />
        <a
          className="header__cta"
          href={`mailto:${profile.email}`}
        >
          {t.profile.status}
        </a>
      </div>

      <span className="header__progress" aria-hidden="true">
        <span ref={barRef} className="header__progress-bar" />
      </span>
    </header>
  );
}

