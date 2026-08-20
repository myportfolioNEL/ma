import type { ReactNode } from "react";
import Reveal from "./Reveal";
import { useFieldEnergy } from "../../hooks/useFieldEnergy";

/**
 * SectionHeadMobile - the finger version of a section heading.
 *
 * Stacked, left-aligned, and quiet. Everything that moves here is either a
 * transform or an opacity, and nothing moves at all until the section scrolls
 * into view once.
 */

type Props = {
  index: string;
  title: string;
  note?: ReactNode;
};

export default function SectionHeadMobile({ index, title }: Props) {
  const energy = useFieldEnergy<HTMLDivElement>({ radius: 170, step: 0.1 });

  return (
    <div className="head" ref={energy.ref}>
      <Reveal kind="fade" className="head__top">
        <span className="mono head__index">{index}</span>
        <span className="head__rule" aria-hidden="true" />
      </Reveal>

      <Reveal kind="up" delay={0.04}>
        <h2 className="h2 head__title">{title}</h2>
      </Reveal>
    </div>
  );
}
