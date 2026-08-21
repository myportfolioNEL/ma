import { CvViewDesktop } from "./CvViewDesktop";
import { CvViewMobile } from "./CvViewMobile";
import type { CvLocale } from "../../data/cv";
import { usePlatform } from "../../lib/platform";

type Props = {
  /** Which document to read. Chosen by the eye that was pressed. */
  locale: CvLocale;
  onClose: () => void;
};

/**
 * The reader has two builds, not one build with breakpoints: a finger drags the
 * glass, a mouse wears it, and those are different components rather than
 * different CSS.
 */
export default function CvView({ locale, onClose }: Props) {
  const platform = usePlatform();
  return platform === "mobile" ? (
    <CvViewMobile locale={locale} onClose={onClose} />
  ) : (
    <CvViewDesktop locale={locale} onClose={onClose} />
  );
}
