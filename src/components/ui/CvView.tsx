import type { Locale } from "../../data/translations";
import { usePlatform } from "../../lib/platform";
import CvViewDesktop from "./CvViewDesktop";
import CvViewMobile from "./CvViewMobile";

/**
 * CvView - the switch, and nothing else.
 *
 * Same rule as Button, Loader and MailPlate: no component asks whether this is
 * a phone. A window that is dragged away by a finger and a window that is
 * closed with Escape want different chrome, different targets and different
 * weight, so there are two complete components and this file picks one.
 * usePlatform is a matchMedia listener, so rotating a tablet swaps the
 * implementation live.
 */

type Props = {
  /** Which CV to open first. The window can change it without closing. */
  locale: Locale;
  onClose: () => void;
};

export default function CvView(props: Props) {
  const platform = usePlatform();
  return platform === "mobile" ? (
    <CvViewMobile {...props} />
  ) : (
    <CvViewDesktop {...props} />
  );
}
