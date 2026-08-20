import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { CV_ORDER, cv } from "../../data/cv";
import { useLocale } from "../../context/LocaleContext";
import { Check, Download } from "./Icons";
import { downloadCv, nativeSaveCv, warmCv } from "../../lib/cv";
import type { Locale } from "../../data/translations";

/**
 * CvButton - one plate that names the file, and a rail with three cells that
 * choose its language: AR, EN, FR.
 *
 * WHY THE CODES ARE THE WHOLE LABEL. Three cells, three glyph pairs, identical
 * in every locale. A full language name would be a different width in each of
 * the three alphabets, so the control would change shape when the site changes
 * language - and the codes are already what the file is called.
 *
 * WHY THERE IS NO EXPANDED STATE. The previous version hid the languages behind
 * a click and needed two document-level listeners to close itself again. Three
 * cells that are always visible need neither: one click, one file.
 *
 * WHY EVERY CELL IS A REAL ANCHOR. href, download, hrefLang and type are all
 * set, so a modified click behaves exactly as the browser promises - open in a
 * new tab, save as, drag to the desktop - and a visitor with no JavaScript
 * still downloads the file. The click handler is an enhancement over a link
 * that already works, not a replacement for one.
 *
 * WHY THE GLIDER IS CSS AND NOT STATE. The lit segment on the rail answers two
 * questions at once: which language the site is in, and which file you are
 * about to ask for. The first is `data-rest`, written once per locale change.
 * The second is `:has(.cv__opt:nth-of-type(n):hover)` in the stylesheet. Neither
 * costs a re-render, and the only property that animates is translateY on one
 * composited layer - so pointing at a cell costs React nothing and the
 * compositor one transform.
 */

type CellState = "idle" | "busy" | "done" | "failed";

/** How long a finished cell keeps its tick before returning to its code. */
const SETTLE = 2200;

export default function CvButton() {
  const { t } = useLocale();
  const [states, setStates] = useState<Record<Locale, CellState>>({
    en: "idle",
    fr: "idle",
    ar: "idle",
  });
  const [note, setNote] = useState("");
  const timers = useRef<Partial<Record<Locale, number>>>({});
  const warmed = useRef<Set<Locale>>(new Set());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      for (const id of Object.values(pending)) {
        if (typeof id === "number") window.clearTimeout(id);
      }
    };
  }, []);

  const settle = useCallback((locale: Locale) => {
    const previous = timers.current[locale];
    if (typeof previous === "number") window.clearTimeout(previous);
    timers.current[locale] = window.setTimeout(() => {
      if (!alive.current) return;
      setStates((current) => ({ ...current, [locale]: "idle" }));
    }, SETTLE);
  }, []);

  /* Hover and focus start the race before the click does, so by the time the
     visitor decides, the file is usually already in memory. */
  const warm = useCallback((locale: Locale) => {
    if (warmed.current.has(locale)) return;
    warmed.current.add(locale);
    void warmCv(cv[locale]);
  }, []);

  const start = useCallback(
    async (locale: Locale) => {
      const file = cv[locale];
      setStates((current) => ({ ...current, [locale]: "busy" }));
      setNote(t.ui.cvStatusBusy);
      try {
        const delivery = await downloadCv(file);
        if (!alive.current) return;
        setStates((current) => ({ ...current, [locale]: "done" }));
        setNote(delivery.suspect ? t.ui.cvStatusSuspect : t.ui.cvStatusDone);
      } catch {
        if (!alive.current) return;
        setStates((current) => ({ ...current, [locale]: "failed" }));
        setNote(t.ui.cvStatusFailed);
        /* Hand the visitor back to the browser rather than to an error: the
           first source is same-origin, so a plain anchor still downloads it. */
        nativeSaveCv(file);
      }
      settle(locale);
    },
    [settle, t],
  );

  const pick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>, locale: Locale) => {
      /* A modified click belongs to the browser. Only a plain left click is
         ours to intercept. */
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      void start(locale);
    },
    [start],
  );

  const ariaFor = (locale: Locale): string => {
    if (locale === "ar") return t.ui.cvAriaAr;
    if (locale === "fr") return t.ui.cvAriaFr;
    return t.ui.cvAriaEn;
  };

  /* Where the glider sits when nobody is pointing at anything: on the language
     the site is currently in. Falls back to the first cell if the locale is
     somehow not in CV_ORDER, so the rail is never blank. */
  const restIndex = Math.max(0, CV_ORDER.indexOf(t.locale));

  return (
    <div className="cv">
      <span className="cv__head">
        <span className="cv__mark" aria-hidden="true">
          <Download size={16} />
        </span>
        <span className="cv__copy">
          <span className="cv__label">{t.ui.cvDownload}</span>
          <span className="cv__meta">{t.ui.cvHint}</span>
        </span>
      </span>

      <span
        className="cv__seg"
        role="group"
        aria-label={t.ui.cvAriaLabel}
        data-rest={restIndex}
      >
        {CV_ORDER.map((locale) => {
          const file = cv[locale];
          const size = `${Math.round(file.bytes / 1024)} ${t.ui.cvSizeUnit}`;
          return (
            <a
              key={locale}
              className="cv__opt"
              href={file.sources[0].url}
              download={file.fileName}
              hrefLang={locale}
              type="application/pdf"
              data-state={states[locale]}
              data-current={locale === t.locale ? "true" : undefined}
              aria-label={`${ariaFor(locale)} - ${size}`}
              title={`${file.code} - ${size}`}
              onPointerEnter={() => warm(locale)}
              onFocus={() => warm(locale)}
              onClick={(event) => pick(event, locale)}
            >
              <span className="cv__opt-code ltr">{file.code}</span>
              <span className="cv__opt-size ltr" aria-hidden="true">
                {size}
              </span>
              <span className="cv__opt-done" aria-hidden="true">
                <Check size={13} />
              </span>
              <span className="cv__opt-line" aria-hidden="true" />
            </a>
          );
        })}

        {/* The rail, and the one lit segment that rides it. A span, not an
            anchor, so :nth-of-type on .cv__opt keeps counting only the three
            cells above. */}
        <span className="cv__rail" aria-hidden="true">
          <span className="cv__glider" />
        </span>
      </span>

      {/* The state of a download is information a screen reader needs and the
          eye already has from the cell itself. */}
      <p className="cv__live" role="status" aria-live="polite">
        {note}
      </p>
    </div>
  );
}
