import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { CV_ORDER, cv } from "../../data/cv";
import { useLocale } from "../../context/LocaleContext";
import { Check, Download, Eye } from "./Icons";
import { downloadCv, nativeSaveCv, warmCv } from "../../lib/cv";
import type { Locale } from "../../data/translations";
import CvView from "./CvView";

/**
 * CvButton - one plate that names the file, a rail with three cells that choose
 * its language, and an eye per file that reads it without downloading it.
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
 * WHY THREE EYES ON THE RAIL. One eye per row, in front of its own file, opening
 * that file. The anchor elements are :nth-of-type among anchors and the button
 * elements are :nth-of-type among buttons, so the glider rules keep working
 * untouched.
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
  /* Which document the reader is showing, or null when the window is closed. */
  const [viewing, setViewing] = useState<Locale | null>(null);
  const timers = useRef<Partial<Record<Locale, number>>>({});
  const warmed = useRef<Set<Locale>>(new Set());
  /* One eye per row, so focus can go back to the exact eye that was pressed. */
  const eyes = useRef<Partial<Record<Locale, HTMLButtonElement | null>>>({});
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

  const openView = useCallback((locale: Locale) => {
    setViewing(locale);
  }, []);

  /* Returning focus to the eye that opened the window is what makes the reader
     usable by keyboard: you come back exactly where you left. */
  const closeView = useCallback(() => {
    const locale = viewing;
    setViewing(null);
    if (locale) {
      window.requestAnimationFrame(() => eyes.current[locale]?.focus());
    }
  }, [viewing]);

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
          const state = states[locale];
          return (
            <Fragment key={locale}>
              {/* unchanged: the download link, still the primary action */}
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

              {/* new: read this file without downloading it */}
              <button
                aria-label={`${t.ui.cvViewOpen} — ${file.code}`}
                className="cv__eye"
                onClick={() => openView(locale)}
                ref={(node) => {
                  eyes.current[locale] = node;
                }}
                title={`${t.ui.cvViewOpen} — ${file.code}`}
                type="button"
              >
                <Eye size={15} />
              </button>
            </Fragment>
          );
        })}

        <span className="cv__rail" aria-hidden="true">
          <span className="cv__glider" />
        </span>
      </span>

      <p className="cv__live" role="status" aria-live="polite">
        {note}
      </p>

      {viewing ? <CvView doc={viewing} onDoc={setViewing} onClose={closeView} /> : null}
    </div>
  );
}
