import { profile } from "../../data/profile";
import { useLocale } from "../../context/LocaleContext";
import { ArrowUpRight, WhatsApp } from "./Icons";

/**
 * WhatsPlate - the second half of the contact pair.
 *
 * WHY A PLATE AND NOT A FIFTH .channel TILE. The four tiles under the plate are
 * a list of places I exist. WhatsApp is not that. In this market it is where a
 * conversation actually starts, so it stands next to the mail plate at the same
 * weight, in the same frame language, and it says what it will do before it is
 * pressed.
 *
 * WHAT THIS COMPONENT IS NOT ALLOWED TO DO:
 *   - hold the phone number. It lives once, in data/profile.ts, and is read
 *     from there. A number typed twice is a number that will disagree.
 *   - carry copy in JSX. Every visible string comes from t.ui.
 *   - animate from JavaScript. Hover, focus and press are CSS on .wp: no hook,
 *     no filter, no tween. This plate costs nothing on the main thread, which
 *     is the whole point of adding it in the same round as a performance
 *     complaint.
 */

const CHANNEL_ID = "whatsapp";

export default function WhatsPlate() {
  const { t } = useLocale();

  const channel = profile.channels.find((item) => item.id === CHANNEL_ID);

  /* No dead link, ever: if the channel is removed from the data layer the
     plate removes itself. */
  if (!channel) return null;

  /* wa.me accepts a prefilled message as ?text=. The message is localised, so
     an Arabic visitor does not open a chat that opens in English. */
  const href = `${channel.href}?text=${encodeURIComponent(
    t.ui.whatsPlatePrefill,
  )}`;

  return (
    <a
      className="wp"
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t.ui.whatsAriaLabel}
    >
      <span className="wp__mark" aria-hidden="true">
        <WhatsApp size={20} />
      </span>

      <span className="wp__copy">
        <span className="wp__label">{t.ui.whatsPlateLabel}</span>
        <span className="wp__value ltr">{channel.value}</span>
      </span>

      <span className="wp__go" aria-hidden="true">
        <span className="wp__hint">{t.ui.whatsPlateHint}</span>
        <ArrowUpRight size={14} />
      </span>
    </a>
  );
}
