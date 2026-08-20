import { cx } from "../../lib/utils";

/**
 * Marquee — an infinite horizontal ticker with zero JavaScript.
 *
 * The trick: render the list twice inside one track and translate the track by
 * -50%. At that exact point the second copy sits where the first started, so
 * the loop is seamless. A CSS animation on a transform runs on the compositor,
 * which means it keeps moving smoothly even while the main thread is busy —
 * something a JS-driven marquee cannot promise.
 */
type MarqueeProps = {
  items: string[];
  /** Seconds for one full pass. Bigger list => bigger number. */
  duration?: number;
  className?: string;
};

export default function Marquee({
  items,
  duration = 38,
  className,
}: MarqueeProps) {
  const doubled = [...items, ...items];

  return (
    <div
      className={cx("marquee", className)}
      aria-hidden="true"
      style={{ ["--marquee-duration" as string]: `${duration}s` }}
    >
      <div className="marquee__track">
        {doubled.map((item, index) => (
          <span className="marquee__item" key={`${item}-${index}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
