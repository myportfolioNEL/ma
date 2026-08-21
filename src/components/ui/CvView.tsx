import { usePlatform } from "../../lib/platform";
import type { Locale } from "../../data/translations";
import { CvViewDesktop } from "./CvViewDesktop";
import { CvViewMobile } from "./CvViewMobile";

/**
 * CvView - one door, two rooms.
 *
 * The desktop reader is a centred window; the phone reader is a sheet that comes
 * up from the bottom and can be thrown away downwards. They are separate
 * components because they are separate interactions, not one component with
 * media queries in it - the same split CaseStudy and CaseSheet already use.
 */

export type CvViewProps = {
  /** Which of the three CV files is being read. */
  doc: Locale;
  /** Switching document from inside the window. */
  onDoc: (locale: Locale) => void;
  onClose: () => void;
};

export function CvView(props: CvViewProps) {
  const platform = usePlatform();
  return platform === "mobile" ? <CvViewMobile {...props} /> : <CvViewDesktop {...props} />;
}

export default CvView;
