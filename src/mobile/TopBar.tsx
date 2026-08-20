import { useEffect, useState } from "react";
import LangSwitch from "../components/ui/LangSwitch";
import { useLocale } from "../context/LocaleContext";
import { profile } from "../data/profile";
import { useScrollDirection } from "../hooks/useUi";

/**
 * TopBar — phone. Deliberately thin: identity and one action.
 *
 * There is no navigation up here. On a phone the top of the screen is the
 * hardest place to reach, so the links live in the tab bar at the bottom and
 * this bar only carries the name and the one thing a visitor might want to do
 * immediately. It hides on scroll down and comes back on scroll up, which is
 * the behaviour phone users already expect from every app they use.
 */

export default function TopBar() {
  const { t } = useLocale();
  const { down, atTop } = useScrollDirection();
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    /* Scroll state only, no animation: a passive listener is enough and this
       never needs to run inside a frame. */
    const onScroll = () => setSolid(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="topbar"
      data-solid={solid ? "" : undefined}
      data-hidden={down && !atTop ? "" : undefined}
    >
      <button
        type="button"
        className="topbar__mark"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={profile.name}
      >
        <img
          className="mark__face"
          src={profile.portraitUrl}
          alt=""
          width={26}
          height={26}
          decoding="async"
          fetchPriority="high"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
        <b>{profile.initials}</b>
      </button>

      <div className="topbar__actions">
        <LangSwitch />
        <a className="topbar__cta" href={`mailto:${profile.email}`}>
          {t.ui.ctaContact}
        </a>
      </div>
    </header>
  );
}

