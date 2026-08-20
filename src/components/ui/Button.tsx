import type { ReactNode } from "react";
import { usePlatform } from "../../lib/platform";
import ButtonDesktop from "./ButtonDesktop";
import ButtonMobile from "./ButtonMobile";

/**
 * Button - the switch, and nothing else.
 *
 * There is no shared button implementation any more, on purpose. A mouse
 * button and a finger button want different structure, different feedback and
 * different sizes, and the version that tries to be both ends up being a
 * desktop button with bigger padding. So there are two complete components,
 * and this file picks one.
 *
 * usePlatform() is driven by a matchMedia listener, so rotating a tablet or
 * dragging a window across screens swaps the implementation live.
 */

type Props = {
  children: ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  variant?: "line" | "primary" | "ghost";
  size?: "md" | "lg";
  icon?: ReactNode;
  className?: string;
  magnetic?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
};

export default function Button(props: Props) {
  const platform = usePlatform();
  return platform === "mobile" ? (
    <ButtonMobile {...props} />
  ) : (
    <ButtonDesktop {...props} />
  );
}
