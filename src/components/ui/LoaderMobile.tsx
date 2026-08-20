import { WAIT_LABEL } from "../../lib/waiting";
import { cx } from "../../lib/utils";

/**
 * LoaderMobile - the waiting mark, touch version.
 *
 *   span.ld              the box
 *   |_ span.ld__vessel   scaleX only
 *   |  |_ span.ld__lip   the gold rim
 *   |  |_ span.ld__sheen one gradient crossing the vessel, no blur
 *   |_ span.ld__trail    background-position only
 *
 * Three elements fewer than the desktop version and zero filters. On a mid
 * range phone that is the difference between a loader that costs nothing and
 * a loader that competes with the download it is reporting.
 */

type Props = {
  size?: "sm" | "md";
  tone?: "royal" | "on-royal";
  label?: string;
};

export default function LoaderMobile({
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
        <span className="ld__sheen" />
      </span>

      <span className="ld__trail" aria-hidden="true" />
    </span>
  );
}
