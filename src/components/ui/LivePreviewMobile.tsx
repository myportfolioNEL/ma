import { useLivePreview } from "../../hooks/useLivePreview";
import { PREVIEW_MOBILE } from "../../lib/preview";
import type { Project } from "../../types";
import LoaderMobile from "./LoaderMobile";

/**
 * LivePreviewMobile - the real landing page inside a phone card.
 *
 * Two differences from the desktop version, and they are the whole reason
 * this is a separate file rather than a prop:
 *
 *   1. TRIGGER. There is no pointer to enter. The card arms itself when it is
 *      more than half on screen, which is the phone equivalent of "you are
 *      looking at this one".
 *   2. VIEWPORT. 414x896, a phone. The framed site renders its own mobile
 *      layout, which is what the visitor's own device would show them.
 *
 * Everything expensive is still refused upstream: Save-Data, 2g and 3g, and
 * devices with less than 4 GB never load a frame at all and keep the poster.
 *
 * PARKING matters more here than on desktop. Scrolling a list of three cards
 * used to load, destroy and reload the same three sites; now a card that
 * scrolls out is parked and comes back instantly when you scroll up again.
 */

type Props = {
  project: Project;
  /** Set false while a modal owns the screen, so nothing loads behind it. */
  enabled?: boolean;
};

export default function LivePreviewMobile({ project, enabled = true }: Props) {
  const src = project.previewUrl ?? project.liveUrl;

  const { boxRef, frameRef, mounted, state, parked, sandbox, onFrameLoad } =
    useLivePreview<HTMLSpanElement>({
      id: `pwm-${project.id}`,
      src,
      viewport: PREVIEW_MOBILE,
      autoMount: 0.55,
      enabled,
    });

  return (
    <span
      ref={boxRef}
      className="pw pw--m"
      data-state={state}
      data-parked={parked ? "true" : undefined}
      aria-hidden="true"
    >
      {mounted ? (
        <iframe
          ref={frameRef}
          className="pw__frame"
          src={src}
          title={`${project.name} landing page`}
          sandbox={sandbox}
          referrerPolicy="no-referrer"
          loading="eager"
          scrolling="no"
          tabIndex={-1}
          aria-hidden="true"
          onLoad={onFrameLoad}
        />
      ) : null}

      {state === "loading" ? (
        <span className="pw__wait" aria-hidden="true">
          <LoaderMobile size="sm" tone="on-royal" />
        </span>
      ) : null}

      {state === "live" ? (
        <span className="pw__flag" aria-hidden="true">
          live
        </span>
      ) : null}
    </span>
  );
}
