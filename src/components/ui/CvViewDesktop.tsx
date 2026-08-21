import { useEffect, useRef } from "react";
import CvPaper from "./CvPaper";
import { Close, Lens } from "./Icons";
import { CV_DOC } from "../../data/cvDoc";
import type { CvLocale } from "../../data/cv";
import { useLocale } from "../../context/LocaleContext";
import { GLASS_DESKTOP } from "../../lib/reader";
import { useReader } from "../../hooks/useReader";

type Props = {
  locale: CvLocale;
  onClose: () => void;
};

/**
 * The reading window, desktop.
 *
 * WHAT IS DELIBERATELY NOT HERE. A title, a page count, a fit percentage, three
 * language pills, a zoom stepper, a magnification badge, a save button, a hint
 * line and a link to a new tab. All of it was in v3 and none of it was asked
 * for: the language is chosen by the eye that opened the window, the file is
 * downloaded from the plate that owns the eye, and a percentage is not
 * information a reader can use. What is left is the document, a magnifier and
 * a way out.
 *
 * THE PAGE IS AT PRINTED SIZE and the stage scrolls. See reader.ts for why
 * fitting this document into a window was arithmetically hopeless.
 */
export function CvViewDesktop({ locale, onClose }: Props) {
  const { t } = useLocale();
  const ui = t.ui;
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const reader = useReader({ size: GLASS_DESKTOP, docKey: locale });

  /* Escape puts the glass away first, then the window: a reader who is
     magnifying something should not lose the whole document in one keystroke. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (reader.open) {
        reader.toggle();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, reader]);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="cvv" role="presentation">
      <div className="cvv__scrim" onClick={onClose} aria-hidden="true" />

      <div
        className="cvv__panel"
        role="dialog"
        aria-modal="true"
        aria-label={ui.cvViewTitle}
        ref={reader.panelRef}
        onKeyDown={reader.onKeyDown}
      >
        <div
          className="cvv__stage"
          ref={reader.stageRef}
          data-lens={reader.open ? "true" : "false"}
          onPointerMove={reader.follow}
          onPointerLeave={reader.leave}
        >
          <CvPaper locale={locale} doc={CV_DOC[locale]} ref={reader.paperRef} />
        </div>

        {/* A sibling of the stage, not a child of it: the page slides under a
            glass that stays where it was put, the way a loupe sits on paper.
            Capture, move and release all live on THIS element - see useReader. */}
        <div
          className="cvv__glass"
          ref={reader.glassRef}
          hidden={!reader.open}
          aria-hidden="true"
          data-over="false"
          data-dragging={reader.dragging ? "true" : undefined}
          onPointerDown={reader.grabDown}
          onPointerMove={reader.grabMove}
          onPointerUp={reader.grabUp}
          onPointerCancel={reader.grabUp}
        >
          <div className="cvv__mirror" ref={reader.mirrorRef} />
          <span className="cvv__sheen" aria-hidden="true" />
          <span className="cvv__rim" aria-hidden="true" />
        </div>

        <div className="cvv__ctl">
          <button
            type="button"
            className="cvv__tool"
            aria-pressed={reader.open}
            aria-label={ui.cvViewLens}
            title={ui.cvViewLens}
            onClick={reader.toggle}
          >
            <Lens size={17} />
          </button>
          <button
            type="button"
            className="cvv__tool cvv__tool--close"
            ref={closeRef}
            aria-label={ui.cvViewClose}
            title={ui.cvViewClose}
            onClick={onClose}
          >
            <Close size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CvViewDesktop;
