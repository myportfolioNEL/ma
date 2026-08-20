import Reveal from "./Reveal";

/**
 * SectionHead — the index / title / note trio that opens every section.
 *
 * It exists so the rhythm of the page is defined once. If the eyebrow ever
 * needs to change from "01 / Work" to "Work — 01", it changes in one file and
 * every section follows. Each part is its own Reveal so they cascade instead
 * of arriving as one block.
 */
type SectionHeadProps = {
  /** Monospaced eyebrow, e.g. "01 / Work". */
  index: string;
  title: string;
  /** Optional supporting line under the title. */
  note?: string;
};

export default function SectionHead({ index, title }: SectionHeadProps) {
  return (
    <header className="head">
      <Reveal as="span" kind="fade" className="mono head__index">
        {index}
      </Reveal>

      <Reveal as="h2" kind="up" delay={0.05} className="h2 head__title">
        {title}
      </Reveal>
    </header>
  );
}
