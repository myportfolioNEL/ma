import { useCallback, useRef, useState } from "react";
import { profile } from "../../data/profile";
import { useLocale } from "../../context/LocaleContext";
import { useFieldEnergy } from "../../hooks/useFieldEnergy";
import { pulseLiquid } from "../../lib/liquid";
import { copyText } from "../../lib/utils";
import { warpPulse } from "../../lib/warp";
import { Check, Copy } from "./Icons";

/**
 * MailPlateDesktop - the address, as an object on the page.
 *
 * Structure, and the single owner of each layer:
 *
 *   div.mp                 the wrapper. Owns nothing that moves.
 *   |_ button.mp__btn      the only focusable node in the whole plate
 *   |  |_ span.mp__warp    the element the displacement filter is leased to
 *   |     |_ span.mp__frame  the ornamental red ground + gold hairline
 *   |     |  |_ span.mp__pt  x4, the gold corner lozenges. Static.
 *   |     |_ span.mp__lines  the two text lines, stacked and clipped
 *   |_ span.mp__hint       three hints, one visible at a time, CSS decides
 *   |_ span.mp__action     the mailto escape hatch
 *   |_ span.mp__live       the polite live region. Empty until a real copy.
 *
 * The plate takes part in the site's field exactly like a button does: it asks
 * for a push on hover, --e rises, and CSS reads --e for the hairline colour
 * and the travel of the thread. One warp pulse runs through .mp__warp on
 * hover, from the same shared pool as the project windows, so it is visibly
 * the same material as the rest of the page.
 */

export default function MailPlateDesktop() {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const energy = useFieldEnergy<HTMLButtonElement>({ radius: 220, step: 0.05 });
  const warpRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef(0);

  const onEnter = useCallback(() => {
    energy.bump(0.75);
    if (warpRef.current) {
      warpPulse(warpRef.current, { amount: 8, duration: 0.42 });
    }
  }, [energy]);

  const onFocus = useCallback(() => {
    /* Keyboard gets the lit edge, not the ripple: a filter that runs on focus
       reads as an error state rather than as an invitation. */
    energy.bump(0.55);
  }, [energy]);

  const onCopy = useCallback(
    async (event: { clientX: number; clientY: number }) => {
      pulseLiquid(event.clientX, event.clientY, 1.3);
      energy.bump(1);

      const ok = await copyText(profile.email);

      window.clearTimeout(timerRef.current);
      setCopied(ok);
      setFailed(!ok);

      /* Both messages clear themselves. A confirmation that stays forever
         stops meaning "just now". */
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        setFailed(false);
      }, 2400);
    },
    [energy],
  );

  const state = copied ? "copied" : failed ? "failed" : "idle";

  return (
    <div className="mp" data-state={state}>
      <button
        ref={energy.ref}
        type="button"
        className="mp__btn"
        onPointerEnter={onEnter}
        onFocus={onFocus}
        onClick={onCopy}
        aria-label={`${t.ui.ctaContact}, ${profile.email}`}
      >
        <span ref={warpRef} className="mp__warp">
          <span className="mp__frame" aria-hidden="true">
            <span className="mp__pt mp__pt--tl" />
            <span className="mp__pt mp__pt--tr" />
            <span className="mp__pt mp__pt--bl" />
            <span className="mp__pt mp__pt--br" />
          </span>

          <span className="mp__lines">
            {/* The first frame. */}
            <span className="mp__line">{t.ui.mailPlateWriteToMe}</span>

            {/* The address, revealed by hover, focus, or a finished copy. */}
            <span className="mp__line mp__line--alt ltr">{profile.email}</span>
          </span>

          <span className="mp__mark" aria-hidden="true">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </span>
        </span>
      </button>

      {/* Three hints, one element each, and CSS shows exactly one. Keeping
          them in the DOM means no layout jump when the wording changes. */}
      <span className="mp__hint" data-hint="rest" aria-hidden="true">
        {t.ui.mailPlateRest}
      </span>
      <span className="mp__hint" data-hint="hover" aria-hidden="true">
        {t.ui.mailPlateHover}
      </span>
      <span className="mp__hint" data-hint="copied" aria-hidden="true">
        {t.ui.mailPlateCopied}
      </span>
      <span className="mp__hint" data-hint="failed" aria-hidden="true">
        {t.ui.mailPlateFailed}
      </span>

      <a
        className="mp__action"
        href={`mailto:${profile.email}`}
        onPointerEnter={onEnter}
      >
        {t.ui.openInMailApp}
      </a>

      {/* One live region for the whole plate. It is empty at rest, so nothing
          is announced until something actually happened. */}
      <span className="mp__live" role="status" aria-live="polite">
        {copied ? t.ui.mailAnnounceCopied : ""}
        {failed ? t.ui.mailAnnounceFailed : ""}
      </span>
    </div>
  );
}
