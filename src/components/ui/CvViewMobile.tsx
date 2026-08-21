import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CV_ORDER, cv } from "../../data/cv";
import type { Locale } from "../../data/translations";
import { useLocale } from "../../context/LocaleContext";
import { useCvDoc } from "../../hooks/useCvDoc";
import { useLoupe } from "../../hooks/useLoupe";
import { useWaiting } from "../../hooks/useWaiting";
import {
  CV_VIEW_TIMEOUT,
  LOUPE_SIZE_MOBILE,
  canLoupe,
  docSrc,
} from "../../lib/cvview";
import { setScrollLocked } from "../../lib/scroll";
import { ArrowUpRight, Close, Download, Loupe } from "./Icons";
import LoaderMobile from "./LoaderMobile";

/**
 * CvViewMobile - the same file, read with a thumb.
 *
 * What differs from the desktop window, and why:
 *   - a sheet, not a centred panel. A dialog that arrives from the bottom edge
 *     is where a phone puts a second surface, and it can be dragged away.
 *   - the grab handle from CaseSheet, with the same 90px threshold, the same
 *     pointer capture and the same 0.28s ease-out. That component's gesture,
 *     not a new one.
 *   - a smaller zoom box, and a grip the size of --tap.
 *   - the zoom buttons live in the footer, where a thumb reaches them, instead
 *     of in the bar.
 *   - no wheel handler is exercised: a finger has no wheel. The two footer
 *     buttons are the whole zoom control and they are full --tap targets.
 *
 * The magnified copy is a second browsing context on a phone, so it is created
 * on the first press of the grip, destroyed CV_VIEW_LINGER after the box is
 * dismissed, and never created at all on a device lib/quality.ts already marked
 * low or that reports less than 4 GB.
 */

type Props = {
  locale: Locale;
  onClose: () => void;
};

type Inline = "waiting" | "live" | "blank";

export default function CvViewMobile({ locale, onClose }: Props) {
  const { t } = useLocale();

  const [shown, setShown] = useState<Locale>(locale);
  const file = cv[shown];

  const { state, src, retry } = useCvDoc(shown);
  const [inline, setInline] = useState<Inline>("waiting");
  const waiting = useWaiting(
    state === "loading" || (src !== "" && inline === "waiting"),
  );

  const panelRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<HTMLIFrameElement | null>(null);
  const watchdogRef = useRef(0);

  const [available] = useState(() => canLoupe());

  const loupe = useLoupe<HTMLDivElement, HTMLSpanElement>({
    size: LOUPE_SIZE_MOBILE,
    enabled: available && src !== "",
  });

  const { armed, dismiss, zoomBy } = loupe;

  useEffect(() => {
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, []);

  useEffect(() => {
    setInline("waiting");
    if (src === "") return;

    watchdogRef.current = window.setTimeout(() => {
      watchdogRef.current = 0;
      setInline((current) => (current === "waiting" ? "blank" : current));
    }, CV_VIEW_TIMEOUT);

    return () => {
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
      watchdogRef.current = 0;
    };
  }, [src]);

  const onDocLoad = useCallback(() => {
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = 0;
    }

    let empty = false;
    try {
      const doc = docRef.current?.contentDocument ?? null;
      if (doc) empty = !doc.body || doc.body.childElementCount === 0;
    } catch {
      empty = false;
    }

    setInline(empty ? "blank" : "live");
  }, []);

  /* A hardware keyboard on a tablet still sends Escape. */
  const armedRef = useRef(false);
  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (armedRef.current) dismiss();
      else onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismiss, onClose]);

  /* Drag the handle to dismiss. Transform while dragging, no layout reads - the
     same effect as CaseSheet, on the same threshold. */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const grab = panel.querySelector<HTMLElement>(".cvv__grab");
    if (!grab) return;

    let startY = 0;
    let offset = 0;
    let dragging = false;

    const onDown = (event: PointerEvent) => {
      dragging = true;
      startY = event.clientY;
      offset = 0;
      grab.setPointerCapture(event.pointerId);
      panel.style.transition = "none";
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      offset = Math.max(0, event.clientY - startY);
      panel.style.transform = `translate3d(0, ${offset}px, 0)`;
    };

    const onUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      grab.releasePointerCapture(event.pointerId);
      panel.style.transition = "transform 0.28s ease-out";

      if (offset > 90) {
        panel.style.transform = "translate3d(0, 100%, 0)";
        window.setTimeout(onClose, 200);
      } else {
        panel.style.transform = "translate3d(0, 0, 0)";
      }
    };

    grab.addEventListener("pointerdown", onDown);
    grab.addEventListener("pointermove", onMove);
    grab.addEventListener("pointerup", onUp);
    grab.addEventListener("pointercancel", onUp);

    return () => {
      grab.removeEventListener("pointerdown", onDown);
      grab.removeEventListener("pointermove", onMove);
      grab.removeEventListener("pointerup", onUp);
      grab.removeEventListener("pointercancel", onUp);
    };
  }, [onClose]);

  const pickLanguage = useCallback(
    (next: Locale) => {
      dismiss();
      setShown(next);
    },
    [dismiss],
  );

  const frameSrc = docSrc(src);

  return createPortal(
    <div className="cvv" role="presentation">
      <button
        type="button"
        className="cvv__scrim"
        onClick={onClose}
        aria-label={t.ui.close}
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        className="cvv__panel"
        role="dialog"
        aria-modal="true"
        aria-label={t.ui.cvViewTitle}
        data-lenis-prevent
      >
        <div className="cvv__grab" aria-hidden="true">
          <span />
        </div>

        <div className="cvv__bar">
          <span className="cvv__crumb">{t.ui.cvViewTitle}</span>

          <span
            className="cvv__seg"
            role="group"
            aria-label={t.ui.cvViewLangLabel}
          >
            {CV_ORDER.map((code) => (
              <button
                key={code}
                type="button"
                className="cvv__lang"
                data-current={code === shown ? "true" : undefined}
                aria-pressed={code === shown}
                onClick={() => pickLanguage(code)}
              >
                <span className="ltr">{cv[code].code}</span>
              </button>
            ))}
          </span>

          <button
            type="button"
            className="cvv__close"
            onClick={onClose}
            aria-label={t.ui.close}
          >
            <Close size={16} />
          </button>
        </div>

        <div className="cvv__stage">
          <div
            ref={loupe.paneRef}
            className="cvv__pane"
            data-state={state}
            data-inline={inline}
            data-dragging={loupe.dragging ? "true" : undefined}
          >
            {src !== "" ? (
              <iframe
                key={frameSrc}
                ref={docRef}
                className="cvv__doc"
                src={frameSrc}
                title={`${t.ui.cvViewTitle} — ${file.code}`}
                loading="eager"
                referrerPolicy="no-referrer"
                onLoad={onDocLoad}
              />
            ) : null}

            {waiting ? (
              <span className="cvv__wait">
                <LoaderMobile tone="royal" label={t.ui.cvViewLoading} />
              </span>
            ) : null}

            {inline === "blank" ? (
              <div className="cvv__miss">
                <p className="cvv__miss-text">{t.ui.cvViewFailed}</p>
                <span className="cvv__miss-row">
                  {src !== "" ? (
                    <a
                      className="cvv__link"
                      href={src}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {t.ui.cvViewNewTab}
                      <ArrowUpRight size={14} />
                    </a>
                  ) : null}
                  <button type="button" className="cvv__link" onClick={retry}>
                    {t.ui.cvViewRetry}
                  </button>
                </span>
              </div>
            ) : null}

            {loupe.mounted && src !== "" ? (
              <span
                ref={loupe.loupeRef}
                className="cvv__loupe"
                data-live={armed ? "true" : "false"}
                aria-hidden="true"
              >
                <span className="cvv__loupe-doc">
                  <iframe
                    className="cvv__loupe-frame"
                    src={frameSrc}
                    title=""
                    tabIndex={-1}
                    aria-hidden="true"
                    scrolling="no"
                    loading="eager"
                    referrerPolicy="no-referrer"
                  />
                </span>
                <span className="cvv__loupe-ring" />
              </span>
            ) : null}
          </div>

          {available && src !== "" ? (
            <button
              type="button"
              className="cvv__grip"
              data-armed={armed ? "true" : undefined}
              onPointerDown={loupe.onGripDown}
              onPointerMove={loupe.onGripMove}
              onPointerUp={loupe.onGripUp}
              onPointerCancel={loupe.onGripUp}
              onClick={loupe.onGripClick}
              aria-label={t.ui.cvViewLoupe}
              title={t.ui.cvViewLoupeHint}
            >
              <Loupe size={18} />
            </button>
          ) : null}
        </div>

        <div className="cvv__foot">
          <span className="cvv__tools">
            <button
              type="button"
              className="cvv__tool"
              onClick={() => zoomBy(-1)}
              disabled={!armed}
              aria-label={t.ui.cvViewZoomOut}
            >
              −
            </button>
            <span className="cvv__zoom ltr" aria-hidden="true">
              {loupe.zoom.toFixed(1)}×
            </span>
            <button
              type="button"
              className="cvv__tool"
              onClick={() => zoomBy(1)}
              disabled={!armed}
              aria-label={t.ui.cvViewZoomIn}
            >
              +
            </button>
          </span>

          <a
            className="cvv__link"
            href={file.sources[0].url}
            download={file.fileName}
            hrefLang={file.locale}
            type="application/pdf"
          >
            {t.ui.cvViewSave}
            <Download size={14} />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
