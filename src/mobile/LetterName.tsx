import { useLetterEngine } from "../hooks/useLetterEngine";

/**
 * LetterName — phone.
 *
 * Same engine, different input. A finger has no hover, so the engine runs in
 * "tap" mode: touching the name sends a single wave outward from the letter
 * you touched, pushes the liquid at that exact point, and then the whole thing
 * goes back to sleep. Between taps it costs nothing — no listeners on the
 * document, no loop, no layers.
 *
 * The heading is a real heading with real text: if a phone is in reduced-motion
 * mode the engine never even splits it.
 */

type Props = {
  text: string;
  id?: string;
  className?: string;
  enabled?: boolean;
};

export default function LetterName({
  text,
  id = "mhero-name",
  className = "",
  enabled = true,
}: Props) {
  const ref = useLetterEngine<HTMLHeadingElement>({
    id,
    enabled,
    mode: "tap",
    /* Heavier follow on the phone: fewer frames, larger letters, and a wave
       that should feel like weight rather than like a twitch. */
    ease: 0.13,
  });

  return (
    <h1 ref={ref} className={`ln ${className}`.trim()}>
      {text}
    </h1>
  );
}
