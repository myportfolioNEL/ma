import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { CV_ORDER, cv } from "../../data/cv";
import { useLocale } from "../../context/LocaleContext";
import { Check, Download, Eye } from "./Icons";
import { downloadCv, nativeSaveCv, warmCv } from "../../lib/cv";
import type { Locale } from "../../data/translations";
import CvView from "./CvView";

/**
 * CvButton - one plate that names the file, a rail with three cells that choose
 * its language, and an eye that reads it instead of saving it.
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
 * WHY THE GLIDER IS CSS AND NOT STATE. The lit segment answers two questions at
 * once: which language the site is in, and which file you are about to ask for.
 * The first is `data-rest`, written once per locale change. The second is
 * `:has(.cv__opt:nth-of-type(n):hover)` in the stylesheet. Neither costs a
 * re-render, and the only property that animates is translateY on one
 * composited layer.
 *
 * WHY THE EYE IS IN THE HEAD AND NOT ON THE RAIL. The glider is positioned by
 * counting .cv__opt with nth-of-type, so a fourth control inside .cv__seg would
 * put a fourth row on a rail divided into three. The head is where a verb that
 * applies to all three files belongs anyway: read, as against save.
 *
 * WHY THE EYE WARMS THE FILE. Hover and focus start the same race the cells
 * start, so pressing the eye usually has nothing left to wait for - the window
 * opens on a Blob that is already in memory. This is why the feature is cheap:
 * the reader and the download share one race, one cache and one integrity
 * check.
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
  const [viewing, setViewing] = useState(false);
  const timers = useRef<Partial<Record<Locale, number>>>({});
  const warmed = useRef<Set<Locale>>(new Set());
  const eyeRef = useRef<HTMLButtonElement | null>(null);
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

  /* The keyboard goes back to the control that opened the window, not to the
     top of the page. */
  const closeView = useCallback(() => {
    setViewing(false);
    eyeRef.current?.focus();
  }, []);

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

        {/* Read, as against save. One button, the site's own glyph, and the
            same warm-up the cells use. */}
        <button
          ref={eyeRef}
          type="button"
          className="cv__eye"
          onClick={() => setViewing(true)}
          onPointerEnter={() => warm(t.locale)}
          onFocus={() => warm(t.locale)}
          aria-label={t.ui.cvViewOpen}
          title={t.ui.cvViewOpen}
          aria-haspopup="dialog"
          aria-expanded={viewing}
        >
          <Eye size={16} />
        </button>
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
          const state = states[locale];
          return (
            <a
              key={locale}
              className="cv__opt"
              href={file.sources[0].url}
              download={file.fileName}
              hrefLang={locale}
              type="application/pdf"
              data-state={state}
              data-current={locale === t.locale ? "true" : undefined}
              aria-label={`${ariaFor(locale)} · ${size}`}
              title={`${file.code} — ${size}`}
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

        <span className="cv__rail" aria-hidden="true">
          <span className="cv__glider" />
        </span>
      </span>

      <p className="cv__live" role="status" aria-live="polite">
        {note}
      </p>

      {viewing ? <CvView locale={t.locale} onClose={closeView} /> : null}
    </div>
  );
}
