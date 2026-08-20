import { usePlatform } from "../../lib/platform";
import MailPlateDesktop from "./MailPlateDesktop";
import MailPlateMobile from "./MailPlateMobile";

/**
 * MailPlate - picks the build. No props: the address comes from profile.ts in
 * both versions, so there is exactly one place in the codebase where it can
 * ever be wrong.
 */
export default function MailPlate() {
  const platform = usePlatform();
  return platform === "mobile" ? <MailPlateMobile /> : <MailPlateDesktop />;
}
