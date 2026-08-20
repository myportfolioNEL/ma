import { useEffect } from "react";
import { useLivePreview } from "../../hooks/useLivePreview";
import { PREVIEW_DESKTOP } from "../../lib/preview";
import type { Project } from "../../types";
import LoaderDesktop from "./LoaderDesktop";

/**
 * LivePreviewDesktop - the real landing page, inside the window frame.
 *
 * WHAT THIS COMPONENT IS NOT ALLOWED TO DO:
 *   - own a transform on an element that a drift hook already owns. It writes
 *     a transform only on .pw__frame, which belongs to nobody else.
 *   - receive a pointer event. CSS sets pointer-events: none on .pw, so the
 *     click always lands on the window button underneath and opens the case
 *     study. The framed site is a picture that happens to be alive.
 *   - be reachable by keyboard or by a screen reader: tabIndex -1 on the
 *     frame, aria-hidden on the layer.
 *   - scroll. scrolling="no" plus pointer-events: none means the wheel is
 *     never captured by the frame, so the page keeps scrolling normally.
 *
 * PARKING. data-parked="true" means: this site is loaded and hidden, waiting
 * for you to come back to this window. The stylesheet turns it into
 * visibility: hidden with content-visibility: hidden (desktop.css:2482), so it
 * is not painted, not laid out and not read by anything - while its document
 * stays exactly as it was. Returning to the window is then free.
 */

type Props = {
  project: Project;
  /** True while the window is hovered or keyboard-focused. */
  active: boolean;
};

export default function LivePreviewDesktop({ project, active }: Props) {
  const src = project.previewUrl ?? project.liveUrl;

  const {
    boxRef,
    frameRef,
    mounted,
    state,
    parked,
    sandbox,
    arm,
    disarm,
    onFrameLoad,
  } = useLivePreview<HTMLSpanElement>({
    id: `pw-${project.id}`,
    src,
    viewport: PREVIEW_DESKTOP,
  });

  useEffect(() => {
    if (active) arm();
    else disarm();
  }, [active, arm, disarm]);

  return (
    <span
      ref={boxRef}
      className="pw"
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
          <LoaderDesktop size="sm" tone="on-royal" />
        </span>
      ) : null}
    </span>
  );
}
