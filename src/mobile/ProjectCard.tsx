import { useState } from "react";
import { ArrowUpRight } from "../components/ui/Icons";
import LivePreviewMobile from "../components/ui/LivePreviewMobile";
import LoaderMobile from "../components/ui/LoaderMobile";
import { useLocale } from "../context/LocaleContext";
import { useWaiting } from "../hooks/useWaiting";
import { imageStillLoading } from "../lib/waiting";
import { useLiquidDrift } from "../hooks/useLiquidDrift";
import { useWarpReveal } from "../hooks/useWarpReveal";
import { pulseLiquid } from "../lib/liquid";
import type { Project } from "../types";

/**
 * ProjectCard - phone.
 *
 * Same policy as the desktop window, for stronger reasons: a phone has one
 * core budget and no pointer to hover with.
 *
 *   - the poster's drift is enabled only after the first press on this card;
 *   - the filter entrance is off, so scrolling a list of cards runs no filter
 *     animation at all - the card arrives with useReveal, which is one class
 *     and a CSS transition;
 *   - the press still pushes the liquid (pulseLiquid) and still pulses the
 *     card (warp.onInteract). Motion is the answer to a touch, not a thing
 *     that happens while you read.
 */

type Props = {
  project: Project;
  index?: number;
  onOpen: (project: Project) => void;
};

export default function ProjectCard({ project, index = 0, onOpen }: Props) {
  const { t } = useLocale();
  const [poster, setPoster] = useState(project.posterUrl);

  const [posterReady, setPosterReady] = useState(false);
  const waiting = useWaiting(!posterReady);

  /* First press on this card, ever. Sticky, like the desktop window. */
  const [armed, setArmed] = useState(false);

  const artRef = useLiquidDrift<HTMLSpanElement>({
    id: `mart-${project.id}`,
    strength: 0.3,
    rotate: 0.2,
    swirl: 1.1,
    ease: 0.07,
    energyVar: true,
    enabled: armed,
  });

  /* No entrance; the pulse on press stays. */
  const warp = useWarpReveal<HTMLDivElement>({ enabled: false });

  return (
    <article className="card" data-project={project.id} data-reveal>
      <div ref={warp.ref} className="card__warp">
        <button
          type="button"
          className="card__btn"
          onPointerDown={(event) => {
            setArmed(true);
            pulseLiquid(event.clientX, event.clientY, 1.1);
            warp.onInteract();
          }}
          onClick={() => onOpen(project)}
          aria-label={`Open case study: ${project.name}`}
        >
          <span className="card__pane">
            <span ref={artRef} className="card__art" aria-hidden="true">
              <img
                className="card__poster"
                data-fit={project.posterFit ?? "cover"}
                src={poster}
                alt=""
                aria-hidden="true"
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async"
                draggable={false}
                ref={(node) => {
                  if (node && !imageStillLoading(node)) setPosterReady(true);
                }}
                onLoad={() => setPosterReady(true)}
                onError={() => {
                  if (poster !== project.imageUrl) setPoster(project.imageUrl);
                  else setPosterReady(true);
                }}
              />
            </span>

            {waiting ? (
              <span className="card__wait" aria-hidden="true">
                <LoaderMobile size="sm" tone="on-royal" />
              </span>
            ) : null}

            {/* Arms itself when the card is more than half on screen, and is
                parked - not destroyed - as you scroll on. */}
            <LivePreviewMobile project={project} />

            <span className="card__wash" aria-hidden="true" />

            <span className="card__top">
              <span>{project.index}</span>
              <span>{project.year}</span>
            </span>

            <span className="card__copy">
              <span className="card__kind">{project.kind}</span>
              <span className="card__title">{project.name}</span>
              <span className="card__sub">{project.subtitle}</span>
            </span>

            <span className="card__foot">
              <span>{project.role}</span>
              <span className="card__open">
                {t.ui.openCase}
                <ArrowUpRight size={14} />
              </span>
            </span>
          </span>
        </button>
      </div>
    </article>
  );
}
