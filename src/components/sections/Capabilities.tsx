import { useLocale } from "../../context/LocaleContext";
import SectionHead from "../ui/SectionHead";
import Reveal from "../ui/Reveal";

/**
 * Capabilities — three clusters, each claim carrying its own evidence.
 *
 * No percentage bars and no five-star ratings: they are unfalsifiable and
 * every portfolio claims 90%. "302 tests" is checkable, so it earns the space.
 *
 * The tools ticker lives in the hero and only there. Repeating the same stack
 * as a second marquee under this section was noise, so it is gone.
 */
export default function Capabilities() {
  const { t } = useLocale();

  return (
    <section className="section" id="capabilities">
      <SectionHead
        index="04 / Capabilities"
        title={t.sectionHeads.capabilities.title}
        note={t.sectionHeads.capabilities.note}
      />

      <div className="caps">
        {t.capabilities.map((cluster, index) => (
          <Reveal
            className="cap"
            kind="up"
            delay={index * 0.07}
            key={cluster.title}
          >
            <span className="cap__index mono">{cluster.index}</span>
            <h3 className="h3 cap__title">{cluster.title}</h3>

            <ul className="cap__items">
              {cluster.items.map((item) => (
                <li className="cap__item" key={item.name}>
                  <span>{item.name}</span>
                  <span className="cap__proof">{item.proof}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
