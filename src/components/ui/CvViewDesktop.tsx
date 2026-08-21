import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CV_ORDER, cv } from "../../data/cv";
import type { Locale } from "../../data/translations";
import { useLocale } from "../../context/LocaleContext";
import { useLens } from "../../hooks/useLens";
import { LENS_SIZE_DESKTOP } from "../../lib/lens";
import { downloadCv } from "../../lib/cv";
import { setScrollLocked } from "../../lib/scroll";
import { ArrowUpRight, Close, Download, Lens, Move } from "./Icons";
import { CvPaper } from "./CvPaper";
import type { CvViewProps } from "./CvView";

/**
 * CvViewDesktop - the reading window.
 *
 * WHAT CHANGED AND WHY. The previous window pointed an iframe at a blob: URL and
 * asked the browser's PDF plugin to draw the page. In a sandboxed or nested
 * context the plugin is not allowed to run, so the pane was empty while the same
 * URL opened perfectly in a real tab - which is exactly what the screenshots
 * showed. The window now draws the document itself with CvPaper, so:
 *
 *   - it always renders, in every browser and every embedding;
 *   - the stage scrolls, so the whole page is reachable instead of one squeezed
 *     A4 rectangle;
 *   - the text can be selected, copied and found with the browser's own search;
 *   - the lens magnifies real vector text instead of a bitmap.
 *
 * The PDF has not gone anywhere: the foot of the window opens it in a tab and
 * saves it, and the plate below still downloads it. The file is the deliverable;
 * this window is the reading room.
 *
 * WHY A PORTAL. The window is a child of document.body, so no ancestor's
 * transform, filter, overflow or stacking context can clip it - the same reason
 * CaseStudy portals.
 */

export function CvViewDesktop({ doc, onDoc, onClose }: CvViewProps) {
  const { t } = useLocale();

  const lens = useLens({ size: LENS_SIZE_DESKTOP, docKey: doc });
  const restore = useRef<HTMLElement | null>(null);
  const file = cv[doc];

  /* Escape closes the lens first, then the window. Two presses, two intentions -
     never lose the reader's place in one keystroke. */
  const escape = useCallback(() => {
    if (lens.open) {
      lens.close();
      return;
    }
    onClose();
  }, [lens, onClose]);

  useEffect(() => {
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, []);

  /* Focus trap - the same shape as CaseStudy.tsx. */
  useEffect(() => {
    const panel = lens.panelRef.current;
    if (!panel) return;
    restore.current = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

    focusable()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        escape();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restore.current?.focus?.();
    };
  }, [escape, lens.panelRef]);

  const save = useCallback(() => {
    void downloadCv(file);
  }, [file]);

  return createPortal(
    <div className="cvv" role="presentation">
      {/* A real button, so the scrim is reachable by keyboard and announced. */}
      <button className="cvv__scrim" type="button" aria-label={t.ui.close} onClick={onClose} />

      <div
        aria-label={t.ui.cvViewTitle}
        aria-modal="true"
        className="cvv__panel"
        data-dragging={lens.dragging ? "true" : "false"}
        ref={lens.panelRef}
        role="dialog"
      >
        <header className="cvv__bar">
          <p className="cvv__crumb">
            {t.ui.cvViewTitle}
            <span className="cvv__pages ltr">{t.ui.cvViewPages}</span>
          </p>

          {/* Switching document inside the window: the reader who opened the
              Arabic file can read the English one without closing anything. */}
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

          <div className="cvv__tools">
            {/* The glass. Press it to put the lens down in the middle, or drag
                straight out of it to place the lens where you want it. */}
            <button
              aria-label={t.ui.cvViewLens}
              aria-pressed={lens.open}
              className="cvv__tool"
              onClick={lens.onGripClick}
              onPointerCancel={lens.onDragUp}
              onPointerDown={lens.onGripDown}
              onPointerMove={lens.onDragMove}
              onPointerUp={lens.onDragUp}
              title={t.ui.cvViewLensHint}
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

            <button aria-label={t.ui.close} className="cvv__close" onClick={onClose} type="button">
              <Close size={16} />
            </button>
          </div>
        </header>

        {/* The stage scrolls. This is the fix for "the box does not show the whole
            page": the page is as tall as it needs to be and the reader moves
            through it, instead of A4 being crushed into whatever height was
            left over. */}
        <div className="cvv__stage" ref={lens.stageRef} tabIndex={-1}>
          <CvPaper foot={t.ui.cvViewSourceNote} key={doc} locale={doc} paperRef={lens.paperRef} />
        </div>

        {/* The lens lives in the panel, not in the stage, so it hovers over the
            page like glass on paper instead of scrolling away with it. */}
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
              <Move size={14} />
            </span>
          </div>
        ) : null}

        <footer className="cvv__foot">
          <p className="cvv__hint">{lens.open ? t.ui.cvViewLensHint : t.ui.cvViewHint}</p>
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
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export default CvViewDesktop;
