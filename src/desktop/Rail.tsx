import { useLocale } from "../context/LocaleContext";
import { scrollToId } from "../hooks/useSmoothScroll";

/**
 * Rail — the section index down the left edge. Desktop only, because it
 * depends on hover for its labels and on horizontal room that a phone does
 * not have. The phone gets a tab bar instead; neither pretends to be the
 * other.
 */

type Props = {
  sections: string[];
  active: string;
};

export default function Rail({ sections, active }: Props) {
  const { t } = useLocale();

  return (
    <nav className="rail" aria-label="Section index">
      {sections.map((id, index) => {
        const navItem = t.navItems.find((item) => item.id === id);
        const label = navItem ? navItem.label : id;

        return (
          <button
            key={id}
            type="button"
            className="rail__item"
            aria-current={active === id ? "true" : undefined}
            aria-label={label}
            onClick={() => scrollToId(id)}
          >
            <span className="rail__index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="rail__line" aria-hidden="true" />
            <span className="rail__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
