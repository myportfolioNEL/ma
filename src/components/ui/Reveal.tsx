import type { ElementType, ReactNode } from "react";
import type { RevealKind } from "../../types";

/**
 * Reveal — a wrapper that only writes data attributes.
 *
 * It contains no animation code at all: useReveal() (mounted once in App)
 * finds every [data-reveal] in the document and animates it with a single
 * batched ScrollTrigger. That is why adding a hundred Reveals costs nothing.
 */
type RevealProps = {
  children: ReactNode;
  /** Which entrance to use. Matches the CSS pre-states in ui.css. */
  kind?: RevealKind;
  /** Seconds of delay, for manual cascades. */
  delay?: number;
  /** Rendered element. Default div, but sections often want <li> or <p>. */
  as?: ElementType;
  className?: string;
  id?: string;
};

export default function Reveal({
  children,
  kind = "up",
  delay = 0,
  as: Tag = "div",
  className,
  id,
}: RevealProps) {
  return (
    <Tag
      id={id}
      className={className}
      data-reveal={kind}
      data-reveal-delay={delay || undefined}
    >
      {children}
    </Tag>
  );
}
