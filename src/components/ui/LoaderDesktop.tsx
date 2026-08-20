import { WAIT_LABEL } from "../../lib/waiting";
import { cx } from "../../lib/utils";

/**
 * LoaderDesktop - the waiting mark, mouse version.
 *
 * Structure, and the one owner of each moving part:
 *
 *   span.ld              the box. Nothing animates it.
 *   |_ span.ld__vessel   scaleX only. The pour.
 *   |  |_ span.ld__lip   the gold rim. Static.
 *   |  |_ span.ld__wisp  x3, opacity and translate only. The vapour.
 *   |_ span.ld__trail    background-position only. The thread being drawn.
 *
 * Accessibility: role="status" with a single label, so the state is announced
 * once and politely. Every decorative part is aria-hidden. When this sits
 * inside an already aria-hidden layer - the live preview, for example - it
 * inherits that and stays silent, which is correct: the preview is a picture.
 */

type Props = {
  /** md is the default. sm is for inside a card or a window pane. */
  size?: "sm" | "md";
  /** royal for bone paper, on-royal for a dark or red ground. */
  tone?: "royal" | "on-royal";
  /** Overrides the announced label. The visible text never changes. */
  label?: string;
};

export default function LoaderDesktop({
  size = "md",
  tone = "royal",
  label,
}: Props) {
  return (
    <span
      className={cx("ld", size === "sm" && "ld--sm", tone === "on-royal" && "ld--on")}
      role="status"
      aria-label={label ?? WAIT_LABEL}
    >
      <span className="ld__vessel" aria-hidden="true">
        <span className="ld__lip" />
        <span className="ld__wisp ld__wisp--1" />
        <span className="ld__wisp ld__wisp--2" />
        <span className="ld__wisp ld__wisp--3" />
      </span>

      <span className="ld__trail" aria-hidden="true" />
    </span>
  );
}
