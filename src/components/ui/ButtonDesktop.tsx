import { useCallback, useRef, type ReactNode } from "react";
import { useFieldEnergy } from "../../hooks/useFieldEnergy";
import { useMagnetic } from "../../hooks/useMagnetic";
import { pulseLiquid } from "../../lib/liquid";
import { smokeBurst, warpPulse, warpSmoke } from "../../lib/warp";
import { cx } from "../../lib/utils";

/**
 * ButtonDesktop — نسخة الماوس.
 *
 * الزر ليس شيئاً موضوعاً فوق الحقل السائل، بل تكثّفٌ منه. لذلك:
 *
 *   سكون    هالة مموّهة + زجاج + خيط أحمر→ذهبي في أول 12% من عرضه
 *   اقتراب  --e يرتفع من lib/energy.ts، فتشتدّ الهالة ويزحف الخيط
 *   hover   نبضة إزاحة واحدة (warpPulse) — السطح يتموّج، لا شيء "ينزلق"
 *   press   دخان: warpSmoke يفكّك السطح + ثلاث نفخات CSS + دفعة في السائل
 *
 * البنية:
 *   button.btn         مالك الـ transform المغناطيسي
 *   ├─ span.btn__fog   الهالة. blur ثابت، opacity فقط تتغيّر
 *   ├─ span.btn__warp  الطبقة الوحيدة التي يُعلّق عليها فلتر SVG
 *   └─ span.btn__smoke النفخات. لا تُرسم إلا عند data-smoke="on"
 */

type Variant = "line" | "primary" | "ghost";
type Size = "sm" | "md" | "lg";

export type ButtonDesktopProps = {
  children: ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  magnetic?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
};

export default function ButtonDesktop({
  children,
  href,
  external,
  onClick,
  variant = "line",
  size = "md",
  icon,
  className,
  magnetic = true,
  type = "button",
  ariaLabel,
}: ButtonDesktopProps) {
  const magneticRef = useMagnetic<HTMLAnchorElement & HTMLButtonElement>(
    magnetic ? 0.2 : 0,
  );
  const energy = useFieldEnergy<HTMLAnchorElement & HTMLButtonElement>({
    radius: 190,
    step: 0.05,
  });
  const rootRef = useRef<(HTMLAnchorElement & HTMLButtonElement) | null>(null);
  const warpRef = useRef<HTMLSpanElement | null>(null);

  /* عقدة واحدة، ثلاث مراجع. كلها mutable refs تُقرأ داخل effects تعمل بعد
     هذه الدالة، فالإسناد هنا آمن. */
  const setRoot = useCallback(
    (node: (HTMLAnchorElement & HTMLButtonElement) | null) => {
      magneticRef.current = node;
      energy.ref.current = node;
      rootRef.current = node;
    },
    [magneticRef, energy.ref],
  );

  const onEnter = useCallback(() => {
    energy.bump(0.7);
    if (warpRef.current) {
      warpPulse(warpRef.current, { amount: 8, duration: 0.42 });
    }
  }, [energy]);

  /* لوحة المفاتيح تحصل على نفس الحافة المضيئة بلا تشويه: فلتر يعمل عند
     التركيز يُقرأ كخطأ، لا كدعوة. */
  const onFocus = useCallback(() => {
    energy.bump(0.55);
  }, [energy]);

  /* الضغط = الدخان. ثلاثة أشياء في إطار واحد:
     السائل يُدفع عند نقطة التماس، السطح يتفكّك، والنفخات ترتفع. */
  const onPress = useCallback(
    (event: { clientX: number; clientY: number }) => {
      pulseLiquid(event.clientX, event.clientY, 1.25);
      energy.bump(1);
      smokeBurst(rootRef.current);
      if (warpRef.current) warpSmoke(warpRef.current, { amount: 24 });
    },
    [energy],
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
        ref={warpRef}
        className={cx("btn__warp", isRoyal ? "is-royal" : "is-paper")}
      >
        <span className="btn__label">
          <span className="btn__text">{children}</span>
          {icon ? <span className="btn__icon">{icon}</span> : null}
        </span>
      </span>
      <span className="btn__smoke" aria-hidden="true">
        <span className="btn__puff btn__puff--1" />
        <span className="btn__puff btn__puff--2" />
        <span className="btn__puff btn__puff--3" />
      </span>
    </>
  );

  if (href) {
    return (
      <a
        ref={setRoot}
        className={classes}
        href={href}
        aria-label={ariaLabel}
        onPointerEnter={onEnter}
        onFocus={onFocus}
        onPointerDown={onPress}
        {...(external ? { target: "_blank", rel: "noreferrer noopener" } : null)}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      ref={setRoot}
      type={type}
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel}
      onPointerEnter={onEnter}
      onFocus={onFocus}
      onPointerDown={onPress}
    >
      {inner}
    </button>
  );
}

