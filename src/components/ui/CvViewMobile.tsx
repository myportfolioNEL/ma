import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import CvPaper from "./CvPaper";
import { Close, Lens } from "./Icons";
import { CV_DOC } from "../../data/cvDoc";
import type { CvLocale } from "../../data/cv";
import { useLocale } from "../../context/LocaleContext";
import { GLASS_MOBILE } from "../../lib/reader";
import { useReader } from "../../hooks/useReader";

type Props = {
  locale: CvLocale;
  onClose: () => void;
};

/** Drag the sheet down further than this and it closes. */
const DISMISS = 120;

export function CvViewMobile({ locale, onClose }: Props) {
  const { t } = useLocale();
  const ui = t.ui;
  const reader = useReader({ size: GLASS_MOBILE, docKey: locale });

  const grabRef = useRef<HTMLButtonElement | null>(null);
  const startY = useRef(0);
  const [pulling, setPulling] = useState(false);

  const setPull = useCallback((value: number) => {
    reader.panelRef.current?.style.setProperty("--cvv-drag", `${Math.round(value)}px`);
  }, [reader.panelRef]);

  const pullDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const bar = grabRef.current;
      if (!bar) return;
      startY.current = event.clientY;
      setPulling(true);
      bar.setPointerCapture(event.pointerId);
    },
    [],
  );

  const pullMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const bar = grabRef.current;
      if (!bar || !bar.hasPointerCapture?.(event.pointerId)) return;
      setPull(Math.max(0, event.clientY - startY.current));
    },
    [setPull],
  );

  const pullUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const bar = grabRef.current;
      if (bar?.hasPointerCapture?.(event.pointerId)) {
        bar.releasePointerCapture(event.pointerId);
      }
      setPulling(false);
      const travelled = event.clientY - startY.current;
      setPull(0);
      if (travelled > DISMISS) onClose();
    },
    [onClose, setPull],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (reader.open) {
        reader.toggle();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, reader]);

  return (
    <div className="cvv" role="presentation">
      <div className="cvv__scrim" onClick={onClose} aria-hidden="true" />

      <div
        className="cvv__panel"
        role="dialog"
        aria-modal="true"
        aria-label={ui.cvViewTitle}
        ref={reader.panelRef}
        data-pulling={pulling ? "true" : undefined}
        onKeyDown={reader.onKeyDown}
      >
        <button
          type="button"
          className="cvv__grab"
          ref={grabRef}
          aria-label={ui.cvViewClose}
          onPointerDown={pullDown}
          onPointerMove={pullMove}
          onPointerUp={pullUp}
          onPointerCancel={pullUp}
          onClick={onClose}
        >
          <span className="cvv__grab-bar" aria-hidden="true" />
        </button>

        <div
          className="cvv__stage"
          ref={reader.stageRef}
          data-lens={reader.open ? "true" : "false"}
          data-lenis-prevent
          tabIndex={0}
        >
          <CvPaper locale={locale} doc={CV_DOC[locale]} ref={reader.paperRef} />
        </div>

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
            <Lens size={18} />
          </button>
          <button
            type="button"
            className="cvv__tool cvv__tool--close"
            aria-label={ui.cvViewClose}
            title={ui.cvViewClose}
            onClick={onClose}
          >
            <Close size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CvViewMobile;
