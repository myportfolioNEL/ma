import type { ReactNode } from "react";
import Reveal from "./Reveal";
import { useFieldEnergy } from "../../hooks/useFieldEnergy";
import { useLetterEngine } from "../../hooks/useLetterEngine";

/**
 * SectionHeadDesktop - the mouse version of a section heading.
 *
 * Layout: index | title | note, on one baseline, with a rule underneath that
 * draws from the left once the title has settled. Wide enough that the note
 * can sit at the far right without crowding the title.
 *
 * Motion, in order of cost:
 *   · the rule: one CSS transform transition, triggered by the class the
 *     reveal system already adds. No JavaScript.
 *   · the index and the rule colour: --e, written by lib/energy.ts only when
 *     the field is actually disturbed near this heading.
 *   · the title: useLetterEngine in pointer mode. The engine culls offscreen
 *     letters, sleeps when the pointer is far, and only ever changes font
 *     axes on the two or three letters nearest the cursor.
 *
 * The engine needs a heading whose only child is text, which is why the h2
 * below contains {title} and nothing else.
 */

type Props = {
  /** Two digits, already formatted by the caller: "01", "02", ... */
  index: string;
  title: string;
  note?: ReactNode;
};

export default function SectionHeadDesktop({ index, title }: Props) {
  const energy = useFieldEnergy<HTMLDivElement>({ radius: 280, step: 0.1 });
  const titleRef = useLetterEngine<HTMLHeadingElement>({
    /* A stable, distinct id per heading: the engine seeds each letter from it,
       so two headings never ripple identically. */
    id: `head-${index}`,
    mode: "pointer",
    ease: 0.12,
  });

  return (
    <div className="head" ref={energy.ref}>
      <Reveal as="span" kind="fade" className="mono head__index">
        {index}
      </Reveal>

      <Reveal kind="up" delay={0.05} className="head__titlewrap">
        <h2 ref={titleRef} className="h2 head__title">
          {title}
        </h2>
      </Reveal>

      <span className="head__rule" aria-hidden="true" />
    </div>
  );
}
