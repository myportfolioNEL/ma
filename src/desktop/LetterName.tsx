import { useLetterEngine } from "../hooks/useLetterEngine";

/**
 * LetterName — a heading whose letters are individually alive.
 *
 * The engine rewrites this element's children in the DOM, so React must not
 * fight it: `text` is a stable string that does not change while mounted, and
 * there are no children to reconcile. If the text ever needs to change, change
 * the `key` on this component instead — that unmounts, restores and remounts
 * cleanly.
 *
 * The engine reads the element's textContent, so the fallback for anyone with
 * reduced motion or no JavaScript is the plain, correct heading.
 */

type Props = {
  text: string;
  /** Stable identity, also used to seed each letter. */
  id?: string;
  className?: string;
  /** Off while the intro timeline owns this element. */
  enabled?: boolean;
};

export default function LetterName({
  text,
  id = "hero-name",
  className = "",
  enabled = true,
}: Props) {
  const ref = useLetterEngine<HTMLHeadingElement>({
    id,
    enabled,
    mode: "pointer",
  });

  return (
    <h1 ref={ref} className={`ln ${className}`.trim()}>
      {text}
    </h1>
  );
}
