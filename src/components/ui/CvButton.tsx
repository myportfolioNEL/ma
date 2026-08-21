import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CvView from "./CvView";
import { Check, Download, Eye } from "./Icons";
import { cv, CV_ORDER, type CvLocale } from "../../data/cv";
import { downloadCv, warmCv } from "../../lib/cv";
import { useLocale } from "../../context/LocaleContext";
import { setScrollLocked } from "../../lib/scroll";

type State = "idle" | "busy" | "done" | "failed";

/** How long a finished row keeps its tick before returning to rest. */
const SETTLE = 2200;

/**
 * The CV plate: three files, three rows.
 *
 * WHY THE CODE AND NOT THE NAME. v3 printed the endonym next to the code -
 * AR / العربية, EN / English, FR / Français - plus the words READ and SAVE THE
 * FILE. Five things per row, three of them redundant, and a plate whose width
 * changed with the interface language. The two-letter code is what the file is
 * called, it is the same two glyphs in every locale, and the icons carry their
 * names in title and aria-label where a screen reader wants them and a layout
 * does not.
 */
export default function CvButton() {
  const { t } = useLocale();
  const ui = t.ui;

  const [states, setStates] = useState<Record<CvLocale, State>>({
    ar: "idle",
    en: "idle",
    fr: "idle",
  });
  const [rest, setRest] = useState<CvLocale | null>(null);
  const [reading, setReading] = useState<CvLocale | null>(null);
  const [live, setLive] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
    },
    [],
  );

  /* The reader is a modal: the page behind it must not scroll under it. */
  useEffect(() => {
    setScrollLocked(reading !== null);
    return () => setScrollLocked(false);
  }, [reading]);

  const aria = useCallback(
    (locale: CvLocale) =>
      locale === "ar" ? ui.cvAriaAr : locale === "en" ? ui.cvAriaEn : ui.cvAriaFr,
    [ui],
  );

  const save = useCallback(
    async (locale: CvLocale) => {
      if (states[locale] === "busy") return;
      setStates((current) => ({ ...current, [locale]: "busy" }));
      setLive(ui.cvStatusBusy);
      try {
        const { suspect } = await downloadCv(locale);
        setStates((current) => ({ ...current, [locale]: "done" }));
        setLive(suspect ? ui.cvStatusSuspect : ui.cvStatusDone);
      } catch {
        setStates((current) => ({ ...current, [locale]: "failed" }));
        setLive(ui.cvStatusFailed);
      }
      timers.current.push(
        window.setTimeout(() => {
          setStates((current) => ({ ...current, [locale]: "idle" }));
        }, SETTLE),
      );
    },
    [states, ui],
  );

  /* Pointing at a row lights the rail and warms the file. Both are idempotent. */
  const point = useCallback((locale: CvLocale) => {
    setRest(locale);
    void warmCv(locale);
  }, []);

  return (
    <div className="cv" data-rest={rest ?? undefined}>
      <div className="cv__head">
        <span className="cv__mark" aria-hidden="true" />
        <span className="cv__copy">
          <span className="cv__label">{ui.cvDownload}</span>
          <span className="cv__meta">{ui.cvHint}</span>
        </span>
      </div>

      <div className="cv__seg" role="group" aria-label={ui.cvAriaLabel}>
        <span className="cv__rail" aria-hidden="true">
          <span className="cv__glider" />
        </span>

        {CV_ORDER.map((locale) => {
          const file = cv[locale];
          const state = states[locale];
          return (
            <div className="cv__row" key={locale} data-state={state}>
              <span className="cv__code">{file.code}</span>
              <span className="cv__size">
                {Math.round(file.bytes / 1024)} {ui.cvSizeUnit}
              </span>

              <span className="cv__acts">
                <button
                  type="button"
                  className="cv__eye"
                  title={`${ui.cvViewOpen} · ${file.code}`}
                  aria-label={`${ui.cvViewOpen} · ${file.code}`}
                  onPointerEnter={() => point(locale)}
                  onFocus={() => setRest(locale)}
                  onPointerLeave={() => setRest(null)}
                  onBlur={() => setRest(null)}
                  onClick={() => setReading(locale)}
                >
                  <Eye size={16} />
                </button>

                <a
                  className="cv__opt"
                  href={file.fileName}
                  download
                  hrefLang={locale}
                  type="application/pdf"
                  data-state={state}
                  title={aria(locale)}
                  aria-label={aria(locale)}
                  onPointerEnter={() => point(locale)}
                  onFocus={() => setRest(locale)}
                  onPointerLeave={() => setRest(null)}
                  onBlur={() => setRest(null)}
                  onClick={(event) => {
                    event.preventDefault();
                    void save(locale);
                  }}
                >
                  {state === "done" ? <Check size={16} /> : <Download size={16} />}
                  <span className="cv__opt-line" aria-hidden="true" />
                </a>
              </span>
            </div>
          );
        })}
      </div>

      <p className="cv__live" role="status" aria-live="polite">
        {live}
      </p>

      {reading !== null &&
        createPortal(
          <CvView locale={reading} onClose={() => setReading(null)} />,
          document.body,
        )}
    </div>
  );
}
