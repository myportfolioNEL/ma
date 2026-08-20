import { usePlatform } from "../../lib/platform";
import LoaderDesktop from "./LoaderDesktop";
import LoaderMobile from "./LoaderMobile";

type Props = {
  size?: "sm" | "md";
  tone?: "royal" | "on-royal";
  label?: string;
};

/**
 * Loader - picks the build. usePlatform is a matchMedia listener, so rotating
 * a tablet swaps the implementation live rather than at next reload.
 */
export default function Loader(props: Props) {
  const platform = usePlatform();
  return platform === "mobile" ? (
    <LoaderMobile {...props} />
  ) : (
    <LoaderDesktop {...props} />
  );
}
