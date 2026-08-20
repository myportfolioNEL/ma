import { useRef, useState } from "react";
import { ArrowUpRight } from "../components/ui/Icons";
import LivePreviewDesktop from "../components/ui/LivePreviewDesktop";
import LoaderDesktop from "../components/ui/LoaderDesktop";
import { useLocale } from "../context/LocaleContext";
import { useWaiting } from "../hooks/useWaiting";
import { imageStillLoading } from "../lib/waiting";
import { useLiquidDrift } from "../hooks/useLiquidDrift";
import { useWarpReveal } from "../hooks/useWarpReveal";
import type { Project } from "../types";

/**
 * ProjectWindow - a closed application window that opens into a case study.
 *
 * THREE LAYERS, THREE OWNERS, AND NOTHING MOVES UNTIL YOU ARRIVE:
 *
 *   .win        - the arrival. Owned by useReveal: one class, and the
 *                 stylesheet moves it. This is the cheapest animation in the
 *                 project and it is now the only one that runs unprompted.
 *   .win__float - the drift layer. Owned by useLiquidDrift, transform only,
 *                 and ENABLED ONLY AFTER CONTACT. Until you hover or focus a
 *                 window, it has no subscription to the shared clock, no
 *                 observer and no transform.
 *   .win__warp  - the contact layer. Owned by useWarpReveal with the entrance
 *                 turned off: it no longer hides the window before first paint
 *                 and no longer animates a filter on arrival. It exists for
 *                 onInteract, which sends one pulse when you touch the window
 *                 - subject to the filter pool, the cooldown and the device
 *                 budget, as before.
 *
 * WHAT WAS REMOVED, AND WHY:
 *   - the `art-*` drift on .win__art. A second subscriber per window whose only
 *     job was to move a full-bleed poster independently of its frame. It made
 *     the largest element in the window a continuously moving composited layer.
 *     The pane still has depth from the drift of the frame around it.
 *   - the `chrome-*` drift on .win__chrome. Its own comment described it as
 *     "small enough to be felt rather than seen" at strength 0.22. That is a
 *     cost with no visible return: three windows meant three more subscribers.
 *   - the arrival warp. Motion before contact was the complaint.
 *
 * Nine subscribers on this page became three, and none of them exist before
 * you interact with the window they belong to. To bring the poster's own drift
 * back, one call is enough - see the end of this file's history in PROMPT 03.
 *
 * IMAGES. Two of the three projects use a wide poster for the window and keep
 * the real screenshot for the case study. NL is the deliberate exception: the
 * same screenshot in both places, shown whole and centred rather than cropped
 * - see data/projects.ts. The component does not know which is which; it just
 * passes posterFit through to CSS.
 */

type Props = {
  project: Project;
  index: number;
  onOpen: (project: Project, source: HTMLElement | null) => void;
};

export default function ProjectWindow({ project, index, onOpen }: Props) {
  const { t } = useLocale();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [poster, setPoster] = useState(project.posterUrl);

  /* The poster's own wait. `true` until the bitmap is decoded, or until it
     failed and the fallback took over. useWaiting turns that into a loader
     that only appears if the wait is real: on a warm cache it never shows. */
  const [posterReady, setPosterReady] = useState(false);
  const waiting = useWaiting(!posterReady);

  /* Hover or keyboard focus. This is the only thing that arms the live page;
     the hook decides whether it is allowed to load, and parks it again. */
  const [hot, setHot] = useState(false);

  /* First contact with THIS window, ever. Sticky on purpose: a window you have
     touched keeps its drift for the rest of the visit, so moving the pointer
     in and out does not subscribe and unsubscribe on every pass. Windows you
     never touch never animate at all. */
  const [armed, setArmed] = useState(false);

  /* The frame, and the only drift in this component. */
  const driftRef = useLiquidDrift<HTMLDivElement>({
    id: `win-${project.id}`,
    strength: index % 2 === 0 ? 1 : 0.8,
    rotate: index % 2 === 0 ? 0.5 : -0.5,
    ease: 0.1,
    squash: 0.7,
    energyVar: true,
    enabled: armed,
  });

  /* No entrance. enabled: false makes the hook hand opacity straight back to
     the stylesheet and mark itself settled, which leaves onInteract working as
     a pulse and removes the filter animation that used to run while you were
     merely scrolling past. */
  const warp = useWarpReveal<HTMLDivElement>({ enabled: false });

  const onContact = () => {
    setArmed(true);
    warp.onInteract();
    setHot(true);
  };

  return (
    <article className="win" data-project={project.id} data-reveal>
      <div ref={driftRef} className="win__float">
        <div ref={warp.ref} className="win__warp">
          <button
            ref={buttonRef}
            type="button"
            className="win__btn"
            onClick={() => onOpen(project, buttonRef.current)}
            onPointerEnter={onContact}
            onPointerLeave={() => setHot(false)}
            onFocus={onContact}
            onBlur={() => setHot(false)}
            aria-label={`Open case study: ${project.name}`}
          >
            <span className="win__chrome" aria-hidden="true">
              <span className="win__index">{project.index}</span>
              <span className="win__url ltr">
                {project.liveUrl.replace(/^https?:\/\//, "")}
              </span>
              <span className="win__live">
                <i className="win__dot" />
                live
              </span>
            </span>

            <span className="win__pane">
              {/* Still its own layer in the stylesheet; no longer its own
                  animation owner. */}
              <span className="win__art" aria-hidden="true">
                <img
                  className="win__poster"
                  data-fit={project.posterFit ?? "cover"}
                  src={poster}
                  alt=""
                  aria-hidden="true"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                  draggable={false}
                  ref={(node) => {
                    /* A cached image can be complete before React attaches
                       onLoad, and then the load event never fires again. Ask
                       the element directly on mount. */
                    if (node && !imageStillLoading(node)) setPosterReady(true);
                  }}
                  onLoad={() => setPosterReady(true)}
                  onError={() => {
                    /* A wrong poster path costs a tint, never a hole. */
                    if (poster !== project.imageUrl) setPoster(project.imageUrl);
                    else setPosterReady(true);
                  }}
                />
              </span>

              {/* The poster's wait, centred in the pane. It is removed from
                  the DOM the moment the bitmap is ready. */}
              {waiting ? (
                <span className="win__wait" aria-hidden="true">
                  <LoaderDesktop tone="on-royal" />
                </span>
              ) : null}

              {/* The real landing page. Nothing in the DOM until the window is
                  hovered or focused; parked, not destroyed, when you leave. */}
              <LivePreviewDesktop project={project} active={hot} />

              <span className="win__wash" aria-hidden="true" />

              <span className="win__copy">
                <span className="win__kind">{project.kind}</span>
                <span className="win__title">{project.name}</span>
                <span className="win__sub">{project.subtitle}</span>
              </span>

              <span className="win__foot">
                <span className="win__meta">
                  {project.year} · {project.role}
                </span>
                <span className="win__open">
                  {t.ui.openCase}
                  <ArrowUpRight size={14} />
                </span>
              </span>
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
