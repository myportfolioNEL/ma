import { useCallback, useRef, type PointerEvent, type ReactNode } from "react";
import { useFieldEnergy } from "../../hooks/useFieldEnergy";
import { pulseLiquid } from "../../lib/liquid";
import { cx } from "../../lib/utils";

/**
 * ButtonMobile - the finger version.
 *
 * Everything here happens inside a single pointerdown handler, and it writes
 * two custom properties and one class. There is no loop, no tween and no
 * state update, so a tap costs a repaint of one element and nothing else.
 *
 * The ripple is a CSS animation rather than a JavaScript one on purpose: the
 * moment of a tap is the moment the main thread is busiest (React handlers,
 * navigation, scroll settling), and a CSS animation on transform/opacity is
 * the only kind that is immune to that.
 *
 * Structure:
 *
 *   button.btn            no transform owner, so :active can scale it in CSS
 *   |_ span.btn__ink      the ripple, positioned from --rx/--ry
 *   |_ span.btn__label    the text and the optional icon
 */

type Variant = "line" | "primary" | "ghost";
type Size = "sm" | "md" | "lg";

export type ButtonMobileProps = {
  children: ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  /** Accepted and ignored: there is no magnetism on a touchscreen. */
  magnetic?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
};

export default function ButtonMobile({
  children,
  href,
  external,
  onClick,
  variant = "line",
  size = "md",
  icon,
  className,
  type = "button",
  ariaLabel,
}: ButtonMobileProps) {
  const energy = useFieldEnergy<HTMLAnchorElement & HTMLButtonElement>({
    /* A finger disturbs a smaller area than a mouse sweep, and a coarser step
       means far fewer repaints on a weaker GPU. */
    radius: 140,
    step: 0.1,
  });
  const inkRef = useRef<HTMLSpanElement | null>(null);

  const onPress = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const node = event.currentTarget;
      const rect = node.getBoundingClientRect();

      /* Percentages, so the ripple keeps its position if the button reflows
         mid-animation - which happens when the keyboard opens. */
      const rx = ((event.clientX - rect.left) / rect.width) * 100;
      const ry = ((event.clientY - rect.top) / rect.height) * 100;

      const ink = inkRef.current;
      if (ink) {
        ink.style.setProperty("--rx", `${rx.toFixed(1)}%`);
        ink.style.setProperty("--ry", `${ry.toFixed(1)}%`);
        /* Restart the animation reliably: remove the class, force one style
           read, add it back. Cheaper and more predictable than a keyframe
           reset via animation-name. */
        ink.classList.remove("is-on");
        void ink.offsetWidth;
        ink.classList.add("is-on");
      }

      pulseLiquid(event.clientX, event.clientY, 1.1);
      energy.bump(0.9);

      if (variant === "primary" && typeof navigator.vibrate === "function") {
        navigator.vibrate(6);
      }
    },
    [energy, variant],
  );

  const isRoyal = variant === "primary";

  const classes = cx(
    "btn",
    variant === "primary" && "btn--primary",
    variant === "line" && "btn--line",
    variant === "ghost" && "btn--ghost",
    size === "lg" && "btn--lg",
    size === "sm" && "btn--sm",
    className,
  );

  const inner = (
    <>
      <span className="btn__fog" aria-hidden="true" />
      <span
        className={cx("btn__warp", isRoyal ? "is-royal" : "is-paper")}
      >
        <span ref={inkRef} className="btn__ink" aria-hidden="true" />
        <span className="btn__label">
          <span className="btn__text">{children}</span>
          {icon ? <span className="btn__icon">{icon}</span> : null}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <a
        ref={energy.ref}
        className={classes}
        href={href}
        aria-label={ariaLabel}
        onPointerDown={onPress}
        {...(external ? { target: "_blank", rel: "noreferrer noopener" } : null)}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      ref={energy.ref}
      type={type}
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel}
      onPointerDown={onPress}
    >
      {inner}
    </button>
  );
}
