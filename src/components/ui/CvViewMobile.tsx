import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CV_ORDER, cv } from "../../data/cv";
import type { Locale } from "../../data/translations";
import { useLocale } from "../../context/LocaleContext";
import { useLens } from "../../hooks/useLens";
import { LENS_SIZE_MOBILE } from "../../lib/lens";
import { downloadCv, nativeSaveCv } from "../../lib/cv";
import { setScrollLocked } from "../../lib/scroll";
import { ArrowUpRight, Close, Download, Lens, Move } from "./Icons";
import { CvPaper } from "./CvPaper";
import type { CvViewProps } from "./CvView";

/**
 * CvViewMobile - the reading sheet.
 *
 * WHY A SEPARATE COMPONENT. A phone reader is a different interaction, not a
 * narrower window: it comes up from the bottom, it is dismissed by dragging the
 * grab bar down, its controls sit within thumb reach at the foot, and its lens is
 * smaller because a finger covers more of a small screen. CaseSheet already made
 * this choice; this file follows it.
 *
 * WHY THE PAGE IS DRAWN AND NOT EMBEDDED. Mobile Safari and mobile Chrome will
 * not render a PDF inside a frame at all - at best the first page appears, at
 * worst nothing does, which is what the screenshots showed. A drawn page is
 * immune, and it reflows to the width of the phone instead of shrinking A4 to
 * illegibility.
 *
 * WHY THE LENS MATTERS MORE HERE. On a phone the CV is set small. The glass is
 * how a recruiter reads a line without pinching the whole sheet and losing the
 * place - so it is placed in the foot bar, one thumb away, and it can be dragged
 * anywhere on the page.
 */

const DISMISS = 90;
const SETTLE = 200;

export function CvViewMobile({ doc, onDoc, onClose }: CvViewProps) {
  const { t } = useLocale();

  const lens = useLens({ size: LENS_SIZE_MOBILE, docKey: doc });
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const start = useRef(0);
  const offset = useRef(0);
  const [leaving, setLeaving] = useState(false);
  const file = cv[doc];

  useEffect(() => {
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (lens.open) {
        lens.close();
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lens, onClose]);

  /* Drag to dismiss - the same numbers CaseSheet uses, so the two sheets in the
     project feel like one gesture. Downwards only: an upward drag is scrolling. */
  const onGrabDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = event.clientY;
    offset.current = 0;
  }, []);

  const onGrabMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const sheet = sheetRef.current;
    if (!sheet || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const delta = Math.max(0, event.clientY - start.current);
    offset.current = delta;
    sheet.style.transform = `translate3d(0, ${delta}px, 0)`;
    sheet.style.transition = "none";
  }, []);

  const onGrabUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const sheet = sheetRef.current;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!sheet) return;
      sheet.style.transition = "";
      if (offset.current > DISMISS) {
        setLeaving(true);
        sheet.style.transform = "translate3d(0, 100%, 0)";
        window.setTimeout(onClose, SETTLE);
        return;
      }
      sheet.style.transform = "";
    },
    [onClose],
  );

  const save = useCallback(() => {
    try {
      void downloadCv(file);
    } catch {
      nativeSaveCv(file);
    }
  }, [file]);

  return createPortal(
    <div className="cvv cvv--sheet" data-leaving={leaving ? "true" : "false"} role="presentation">
      <button className="cvv__scrim" type="button" aria-label={t.ui.close} onClick={onClose} />

      <div
        aria-label={t.ui.cvViewTitle}
        aria-modal="true"
        className="cvv__panel"
        data-dragging={lens.dragging ? "true" : "false"}
        ref={(node) => {
          sheetRef.current = node;
          lens.panelRef.current = node;
        }}
        role="dialog"
      >
        <button
          aria-label={t.ui.close}
          className="cvv__grab"
          onPointerCancel={onGrabUp}
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          type="button"
        >
          <span className="cvv__grab-bar" />
        </button>

        <header className="cvv__bar">
          <p className="cvv__crumb">{t.ui.cvViewTitle}</p>
          <div aria-label={t.ui.cvViewLangLabel} className="cvv__seg" role="group">
            {CV_ORDER.map((locale: Locale) => (
              <button
                aria-label={`${t.ui.cvViewRead} — ${cv[locale].code}`}
                aria-pressed={locale === doc}
                className="cvv__lang"
                key={locale}
                onClick={() => onDoc(locale)}
                type="button"
              >
                <span className="ltr">{cv[locale].code}</span>
              </button>
            ))}
          </div>
          <button aria-label={t.ui.close} className="cvv__close" onClick={onClose} type="button">
            <Close size={16} />
          </button>
        </header>

        <div className="cvv__stage" ref={lens.stageRef} tabIndex={-1}>
          <CvPaper foot={t.ui.cvViewSourceNote} key={doc} locale={doc} paperRef={lens.paperRef} />
        </div>

        {lens.open ? (
          <div
            aria-hidden="true"
            className="cvv__lens"
            onPointerCancel={lens.onDragUp}
            onPointerDown={lens.onLensDown}
            onPointerMove={lens.onDragMove}
            onPointerUp={lens.onDragUp}
            ref={lens.lensRef}
          >
            <div className="cvv__mirror" ref={lens.mirrorRef} />
            <span className="cvv__ring" />
            <span className="cvv__handle">
              <Move size={13} />
            </span>
          </div>
        ) : null}

        {/* Tools at the foot: on a phone the top of the screen is out of reach. */}
        <footer className="cvv__foot">
          <div className="cvv__tools">
            <button
              aria-label={t.ui.cvViewLens}
              aria-pressed={lens.open}
              className="cvv__tool"
              onClick={lens.onGripClick}
              onPointerCancel={lens.onDragUp}
              onPointerDown={lens.onGripDown}
              onPointerMove={lens.onDragMove}
              onPointerUp={lens.onDragUp}
              type="button"
            >
              <Lens size={16} />
            </button>
            {lens.open ? (
              <span className="cvv__zoom">
                <button
                  aria-label={t.ui.cvViewZoomOut}
                  className="cvv__step"
                  onClick={() => lens.zoomBy(-1)}
                  type="button"
                >
                  −
                </button>
                <b className="ltr">{`${lens.zoom.toFixed(1)}×`}</b>
                <button
                  aria-label={t.ui.cvViewZoomIn}
                  className="cvv__step"
                  onClick={() => lens.zoomBy(1)}
                  type="button"
                >
                  +
                </button>
              </span>
            ) : null}
          </div>

          <div className="cvv__acts">
            <a
              className="cvv__link"
              href={file.sources[0].url}
              hrefLang={doc}
              rel="noreferrer noopener"
              target="_blank"
              type="application/pdf"
            >
              {t.ui.cvViewNewTab}
              <ArrowUpRight size={13} />
            </a>
            <button className="cvv__link" onClick={save} type="button">
              {t.ui.cvViewSave}
              <Download size={13} />
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export default CvViewMobile;
