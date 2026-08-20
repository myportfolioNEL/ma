import { useCallback, useRef, useState } from "react";
import { profile } from "../../data/profile";
import { useLocale } from "../../context/LocaleContext";
import { useFieldEnergy } from "../../hooks/useFieldEnergy";
import { pulseLiquid } from "../../lib/liquid";
import { copyText } from "../../lib/utils";
import { Check, Copy } from "./Icons";

/**
 * MailPlateMobile - the address, as a bar you can hit with a thumb.
 *
 *   div.mp.mp--m
 *   |_ button.mp__btn      one tap target, 60px tall, full width
 *   |  |_ span.mp__frame   the ornamental ground and the gold hairline
 *   |  |_ span.mp__lines   label above, address below. Both always visible.
 *   |  |_ span.mp__ink     the tap ripple, positioned from --rx/--ry
 *   |_ a.mp__action        mailto, full width, its own 48px target
 *   |_ span.mp__live       the polite announcement
 *
 * No hover, no swap, no filter and no warp: everything that happens on a tap
 * is one class and two custom properties, which is the only kind of feedback
 * that survives the busiest moment on the main thread.
 */

export default function MailPlateMobile() {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const energy = useFieldEnergy<HTMLButtonElement>({ radius: 150, step: 0.1 });
  const inkRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef(0);

  const onPress = useCallback(
    (event: { clientX: number; clientY: number; currentTarget: HTMLElement }) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const rx = ((event.clientX - rect.left) / rect.width) * 100;
      const ry = ((event.clientY - rect.top) / rect.height) * 100;

      const ink = inkRef.current;
      if (ink) {
        ink.style.setProperty("--rx", `${rx.toFixed(1)}%`);
        ink.style.setProperty("--ry", `${ry.toFixed(1)}%`);
        ink.classList.remove("is-on");
        void ink.offsetWidth;
        ink.classList.add("is-on");
      }

      pulseLiquid(event.clientX, event.clientY, 1.15);
      energy.bump(0.9);
    },
    [energy],
  );

  const onCopy = useCallback(async () => {
    const ok = await copyText(profile.email);

    window.clearTimeout(timerRef.current);
    setCopied(ok);
    setFailed(!ok);

    /* A short buzz only when the copy actually succeeded. Vibrating on
       failure teaches the wrong thing. */
    if (ok && typeof navigator.vibrate === "function") navigator.vibrate(8);

    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2400);
  }, []);

  const state = copied ? "copied" : failed ? "failed" : "idle";

  return (
    <div className="mp mp--m" data-state={state}>
      <button
        ref={energy.ref}
        type="button"
        className="mp__btn"
        onPointerDown={onPress}
        onClick={onCopy}
        aria-label={`${t.ui.ctaContact}, ${profile.email}`}
      >
        <span className="mp__frame" aria-hidden="true">
          <span className="mp__pt mp__pt--tl" />
          <span className="mp__pt mp__pt--tr" />
          <span className="mp__pt mp__pt--bl" />
          <span className="mp__pt mp__pt--br" />
        </span>

        <span ref={inkRef} className="mp__ink" aria-hidden="true" />

        <span className="mp__lines">
          <span className="mp__label">
            {copied ? t.ui.mailPlateCopiedShort : failed ? t.ui.mailPlateBlockedShort : t.ui.mailPlateTapToCopy}
          </span>
          <span className="mp__addr ltr">{profile.email}</span>
        </span>

        <span className="mp__mark" aria-hidden="true">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </span>
      </button>

      <a className="mp__action" href={`mailto:${profile.email}`}>
        {t.ui.openInMailApp}
      </a>

      <span className="mp__live" role="status" aria-live="polite">
        {copied ? t.ui.mailAnnounceCopied : ""}
        {failed ? t.ui.mailAnnounceFailed : ""}
      </span>
    </div>
  );
}
