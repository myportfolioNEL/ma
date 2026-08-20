import { useLocale } from "../context/LocaleContext";
import { scrollToId } from "../hooks/useSmoothScroll";
import { pulseLiquid } from "../lib/liquid";

/**
 * TabBar — phone navigation, in the thumb zone.
 *
 * This is the structural difference between the two builds. The desktop rail
 * sits on the left edge and relies on hover for its labels; that pattern is
 * unusable with a thumb, so the phone gets a fixed bottom bar with permanent
 * labels, 48px targets and safe-area padding so nothing hides under a home
 * indicator.
 *
 * Round 25: 3 primary tabs (Work, About, Contact) to avoid crowding.
 */

type Props = {
  sections?: string[];
  active: string;
};

const MAIN_TABS = ["work", "about", "contact"];

export default function TabBar({ active }: Props) {
  const { t } = useLocale();

  const items = MAIN_TABS.map((id) => {
    const found = t.navItems.find((n) => n.id === id);
    return {
      id,
      label: found ? found.short || found.label : id,
    };
  });

  return (
    <nav className="tabbar" aria-label="Sections">
      <div className="tabbar__list">
        {items.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="tabbar__item"
            aria-current={active === tab.id ? "true" : undefined}
            onPointerDown={(event) => pulseLiquid(event.clientX, event.clientY, 1)}
            onClick={() => scrollToId(tab.id)}
          >
            <span className="tabbar__dot" aria-hidden="true" />
            <span className="tabbar__label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

