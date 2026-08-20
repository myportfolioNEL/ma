import { useEffect, useRef, useState } from "react";
import Button from "../components/ui/Button";
import { ArrowUpRight, Close } from "../components/ui/Icons";
import LoaderDesktop from "../components/ui/LoaderDesktop";
import { useLocale } from "../context/LocaleContext";
import { useWaiting } from "../hooks/useWaiting";
import { imageStillLoading } from "../lib/waiting";
import type { Project } from "../types";

/**
 * CaseStudy — the desktop overlay.
 */

type Props = {
  project: Project;
  onClose: () => void;
};

export default function CaseStudy({ project, onClose }: Props) {
  const { t, localizeProject } = useLocale();
  const localized = localizeProject(project);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [heroReady, setHeroReady] = useState(false);
  const waiting = useWaiting(!heroReady);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const selector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
    panel.querySelector<HTMLElement>(".case__close")?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="case" data-project={localized.id} role="presentation">
      <button
        type="button"
        className="case__scrim"
        onClick={onClose}
        aria-label={t.ui.close}
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        className="case__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${localized.name} case study`}
        data-lenis-prevent
      >
        <div className="case__bar">
          <span className="case__crumb">
            {localized.index} · {localized.kind}
          </span>
          <button
            type="button"
            className="case__close"
            onClick={onClose}
            aria-label={t.ui.close}
          >
            <Close size={16} />
          </button>
        </div>

        <div className="case__body">
          <header className="case__head">
            <h2 className="case__title">{localized.name}</h2>
            <p className="case__lead">{localized.overview}</p>
          </header>

          {/* The real screenshot. Full colour, no tint, no filter. */}
          <figure className="case__hero" data-waiting={waiting ? "true" : "false"}>
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

            {waiting ? (
              <span className="case__wait">
                <LoaderDesktop tone="royal" label={t.ui.loadingScreenshot} />
              </span>
            ) : null}
          </figure>

          <dl className="case__facts">
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

          <section className="case__block">
            <h3 className="case__h3">{t.ui.sectionProblem}</h3>
            <p className="case__text">{localized.challenge}</p>
          </section>

          <section className="case__block">
            <h3 className="case__h3">{t.ui.sectionBuild}</h3>
            <ul className="case__list">
              {localized.build.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="case__block">
            <h3 className="case__h3">{t.ui.sectionCollab}</h3>
            <p className="case__text">{localized.collaboration}</p>
          </section>

          <section className="case__block">
            <h3 className="case__h3">{t.ui.sectionOutcome}</h3>
            <ul className="case__list">
              {localized.outcome.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="case__block">
            <h3 className="case__h3">{t.ui.sectionStack}</h3>
            <ul className="tags">
              {localized.stack.map((item) => (
                <li key={item} className="tag">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="case__actions">
            <Button variant="primary" href={localized.liveUrl} external>
              {t.ui.openLive}
              <ArrowUpRight size={16} />
            </Button>
            {localized.repoUrl && (
              <Button variant="line" href={localized.repoUrl} external>
                {t.ui.sourceCode}
                <ArrowUpRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

