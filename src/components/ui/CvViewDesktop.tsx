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
  LOUPE_SIZE_DESKTOP,
  canLoupe,
  docSrc,
} from "../../lib/cvview";
import { setScrollLocked } from "../../lib/scroll";
import { ArrowUpRight, Close, Download, Loupe } from "./Icons";
import LoaderDesktop from "./LoaderDesktop";

/**
 * CvViewDesktop - the CV, read in the page.
 *
 * WHY A PORTAL, AND WHY IT IS NOT OPTIONAL. This component is rendered from
 * inside the Contact section, and .section carries content-visibility: auto -
 * which implies paint containment, which makes the section a containing block
 * for fixed-position children. The plate is also inside a [data-reveal], which
 * carries a translate. A fixed overlay rendered in place would be clipped to
 * the section instead of the viewport and would sit under the header. Rendered
 * into document.body, the DOM position of the button that opened it stops
 * mattering.
 *
 * WHY THE SCROLL LOCK IS OWNED HERE. lib/scroll.ts reference-counts it exactly
 * so that a second overlay can take the lock without the first one losing it.
 * Taking it on mount and giving it back on unmount is the whole contract, and
 * AppDesktop needs no new state.
 *
 * FOUR WAYS TO READ THE FILE, IN ORDER OF PREFERENCE: the frame; a new tab; the
 * download in the footer; and the three cells in the plate underneath, which
 * never stopped working. The last three are real anchors with real hrefs. An
 * engine that refuses to display a PDF inside a page is not an error state
 * here - it is one of the four ways.
 */

type Props = {
  locale: Locale;
  onClose: () => void;
};

/** Whether the frame has proved it rendered something. */
type Inline = "waiting" | "live" | "blank";

export default function CvViewDesktop({ locale, onClose }: Props) {
  const { t } = useLocale();

  /* The window's own language, seeded from the site's. Changing it here does
     not change the site. */
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

  /* Asked once. A device that cannot afford a second browsing context is not
     offered a grip, and nothing about that is announced to it. */
  const [available] = useState(() => canLoupe());

  const loupe = useLoupe<HTMLDivElement, HTMLSpanElement>({
    size: LOUPE_SIZE_DESKTOP,
    enabled: available && src !== "",
  });

  const { armed, dismiss, zoomBy } = loupe;

  /* --- the page behind this one stops moving ----------------------------- */

  useEffect(() => {
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, []);

  /* --- did the frame actually render? ----------------------------------- */

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

  /**
   * A load event is not proof. A frame an engine refused to render also fires
   * load, on an empty document. A blob URL is same-origin, so the document can
   * be inspected: a body with no children means nothing was rendered. When the
   * viewer is a plugin the document may be unreadable instead, which throws -
   * and an unreadable document is not evidence of failure, so that case counts
   * as success. The watchdog above is the real failure detector. This is the
   * same refusal heuristic useLivePreview already uses on project frames.
   */
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

  /* --- the keyboard ------------------------------------------------------ */

  /* Read inside the document listener so that arming the loupe does not tear
     the listener down and build it again. Depending on `armed` directly would
     re-run this effect on every arm - and if the focus call lived here it would
     also take the keyboard away from the toolbar every time. */
  const armedRef = useRef(false);
  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const selector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        /* Escape closes the thing that is on top. */
        if (armedRef.current) dismiss();
        else onClose();
        return;
      }

      if (armedRef.current && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        zoomBy(1);
        return;
      }

      if (armedRef.current && (event.key === "-" || event.key === "_")) {
        event.preventDefault();
        zoomBy(-1);
        return;
      }

      if (event.key !== "Tab") return;

      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(selector),
      ).filter((item) => item.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;

      if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismiss, onClose, zoomBy]);

  /* Once, on open. Not on every arm. */
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>(".cvv__close")?.focus();
  }, []);

  const pickLanguage = useCallback(
    (next: Locale) => {
      /* The document is about to be replaced, so the magnified copy of the old
         one goes with it. */
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
                <LoaderDesktop tone="royal" label={t.ui.cvViewLoading} />
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

            {/* The magnified copy. Identical src, identical hash, so it shows
                the same page at the same fit - only bigger. */}
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
          <span className="cvv__hint">
            {state === "unverified" ? t.ui.cvViewUnverified : t.ui.cvViewHint}
          </span>

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

          {/* A real anchor to the same-origin file: the save path never depends
              on anything this component did. */}
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
