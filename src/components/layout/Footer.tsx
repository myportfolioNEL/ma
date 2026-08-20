import { profile } from "../../data/profile";
import { useLocale } from "../../context/LocaleContext";
import { scrollToTop } from "../../hooks/useSmoothScroll";
import { ArrowUpRight } from "../ui/Icons";

/**
 * Footer — closing line, links, year.
 * The year is computed, not typed, so the site never looks abandoned.
 * The meta row carries only what is not already stated elsewhere on the page.
 */
export default function Footer() {
  const { t, locale } = useLocale();
  const year = new Date().getFullYear();

  const tagline =
    locale === "ar"
      ? {
          main: "صُمم وبُني في الدار البيضاء. ",
          accent: "متاح للفرق، العملاء والتعاون.",
        }
      : locale === "fr"
        ? {
            main: "Conçu et développé à Casablanca. ",
            accent: "Disponible pour équipes, clients et collaborateurs.",
          }
        : {
            main: "Designed and built in Casablanca. ",
            accent: "Open to teams, clients and collaborators.",
          };

  return (
    <footer className="footer">
      <div className="footer__grid">
        <div>
          <p className="h3">
            {tagline.main}
            <span className="serif accent">
              {tagline.accent}
            </span>
          </p>
          <nav className="footer__links" aria-label="Elsewhere">
            {profile.channels.map((channel) => (
              <a
                key={channel.id}
                className="footer__link"
                href={channel.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {channel.label}
                <ArrowUpRight size={11} />
              </a>
            ))}
          </nav>
        </div>

        <button
          type="button"
          className="footer__link"
          onClick={scrollToTop}
        >
          {t.ui.backToTop}
        </button>
      </div>

      <div className="footer__meta mono">
        <span>
          © {year} {profile.name}
        </span>
      </div>
    </footer>
  );
}
