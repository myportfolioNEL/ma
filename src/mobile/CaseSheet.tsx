import { useEffect, useRef, useState } from "react";
import Button from "../components/ui/Button";
import { ArrowUpRight, Close } from "../components/ui/Icons";
import LoaderMobile from "../components/ui/LoaderMobile";
import { useLocale } from "../context/LocaleContext";
import { useWaiting } from "../hooks/useWaiting";
import { imageStillLoading } from "../lib/waiting";
import type { Project } from "../types";

/**
 * CaseSheet — the phone case study, as a bottom sheet.
 */

type Props = {
  project: Project;
  onClose: () => void;
};

export default function CaseSheet({ project, onClose }: Props) {
  const { t, localizeProject } = useLocale();
  const localized = localizeProject(project);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const [heroReady, setHeroReady] = useState(false);
  const heroWaiting = useWaiting(!heroReady);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  /* Drag to dismiss, handle only. Transform while dragging, no layout reads. */
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const grab = sheet.querySelector<HTMLElement>(".sheet__grab");
    if (!grab) return;

    let startY = 0;
    let offset = 0;
    let dragging = false;

    const onDown = (event: PointerEvent) => {
      dragging = true;
      startY = event.clientY;
      offset = 0;
      grab.setPointerCapture(event.pointerId);
      sheet.style.transition = "none";
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      offset = Math.max(0, event.clientY - startY);
      sheet.style.transform = `translate3d(0, ${offset}px, 0)`;
    };

    const onUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      grab.releasePointerCapture(event.pointerId);
      sheet.style.transition = "transform 0.28s ease-out";

      /* 90px is far enough to be deliberate and short enough to be easy. */
      if (offset > 90) {
        sheet.style.transform = "translate3d(0, 100%, 0)";
        window.setTimeout(onClose, 200);
      } else {
        sheet.style.transform = "translate3d(0, 0, 0)";
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

  return (
    <div
      ref={sheetRef}
      className="sheet"
      data-project={localized.id}
      role="dialog"
      aria-modal="true"
      aria-label={`${localized.name} case study`}
      data-lenis-prevent
    >
      <div className="sheet__grab" aria-hidden="true">
        <span />
      </div>

      <div className="sheet__bar">
        <span className="mono faint">
          {localized.index} · {localized.kind}
        </span>
        <button
          type="button"
          className="sheet__close"
          onClick={onClose}
          aria-label={t.ui.close}
        >
          <Close size={16} />
        </button>
      </div>

      <div className="sheet__body">
        <h2 className="h1">{localized.name}</h2>
        <p className="sheet__lead">{localized.overview}</p>

        {/* The real screenshot, full colour, and whole when it needs to be. */}
        <figure className="sheet__hero" data-waiting={heroWaiting ? "true" : "false"}>
          <img
            src={localized.imageUrl}
            data-fit={localized.posterFit ?? "cover"}
            alt={localized.imageAlt}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            ref={(node) => {
              if (node && !imageStillLoading(node)) setHeroReady(true);
            }}
            onLoad={() => setHeroReady(true)}
            onError={() => setHeroReady(true)}
          />

          {heroWaiting ? (
            <span className="sheet__wait">
              <LoaderMobile tone="royal" label={t.ui.loadingScreenshot} />
            </span>
          ) : null}
        </figure>

        <dl className="sheet__facts">
          <div>
            <dt>{t.ui.factTimeline}</dt>
            <dd>{localized.timeline}</dd>
          </div>
          <div>
            <dt>{t.ui.factRole}</dt>
            <dd>{localized.role}</dd>
          </div>
          <div>
            <dt>{t.ui.factContext}</dt>
            <dd>{localized.context}</dd>
          </div>
          <div>
            <dt>{t.ui.factScale}</dt>
            <dd>{localized.scale}</dd>
          </div>
        </dl>

        <section className="sheet__block">
          <h3 className="h3">{t.ui.sectionProblem}</h3>
          <p className="prose">{localized.challenge}</p>
        </section>

        <section className="sheet__block">
          <h3 className="h3">{t.ui.sectionBuild}</h3>
          <ul className="sheet__list">
            {localized.build.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sheet__block">
          <h3 className="h3">{t.ui.sectionCollab}</h3>
          <p className="prose">{localized.collaboration}</p>
        </section>

        <section className="sheet__block">
          <h3 className="h3">{t.ui.sectionOutcome}</h3>
          <ul className="sheet__list">
            {localized.outcome.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sheet__block">
          <h3 className="h3">{t.ui.sectionStack}</h3>
          <ul className="tags">
            {localized.stack.map((item) => (
              <li key={item} className="tag">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="sheet__actions">
          <Button variant="primary" size="lg" href={localized.liveUrl} external>
            {t.ui.openLive}
            <ArrowUpRight size={16} />
          </Button>
          {localized.repoUrl && (
            <Button variant="line" size="lg" href={localized.repoUrl} external>
              {t.ui.sourceCode}
              <ArrowUpRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

