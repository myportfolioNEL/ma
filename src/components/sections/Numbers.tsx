import type { Metric } from "../../types";
import { useCountUp } from "../../hooks/useCountUp";
import { useLocale } from "../../context/LocaleContext";
import SectionHead from "../ui/SectionHead";
import Reveal from "../ui/Reveal";

/**
 * Numbers — four counters, every one traceable to a repository.
 *
 * Each Stat owns its own useCountUp hook, which means each number has its own
 * ScrollTrigger and starts counting when it personally becomes visible — not
 * when the section does.
 */
function Stat({ metric }: { metric: Metric }) {
  const ref = useCountUp(metric.value, metric.suffix ?? "");

  return (
    <Reveal className="stat" kind="up">
      <span className="stat__value ltr">
        <span ref={ref}>0</span>
        {metric.suffix ? <em>{metric.suffix}</em> : null}
      </span>
      <span className="stat__label">{metric.label}</span>
    </Reveal>
  );
}

export default function Numbers() {
  const { t } = useLocale();

  return (
    <section className="section section--tight" id="numbers">
      <SectionHead
        index="02 / Numbers"
        title={t.sectionHeads.numbers.title}
        note={t.sectionHeads.numbers.note}
      />

      <div className="stats">
        {t.metrics.map((metric) => (
          <Stat key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}
