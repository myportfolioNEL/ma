import { profile } from "../../data/profile";
import { useLocale } from "../../context/LocaleContext";
import CvButton from "../ui/CvButton";
import MailPlate from "../ui/MailPlate";
import Reveal from "../ui/Reveal";
import WhatsPlate from "../ui/WhatsPlate";
import { ArrowUpRight } from "../ui/Icons";

/**
 * Contact — closing section.
 *
 * There is no form. A form on a personal site is a spam funnel that hides the
 * address; a mailto plus a one-click copy is faster for a recruiter and cannot
 * fail silently the way a form submission can.
 */
export default function Contact() {
  const { t } = useLocale();

  return (
    <section className="section contact" id="contact">
      <Reveal as="p" kind="fade" className="mono accent">
        05 / Contact
      </Reveal>

      <Reveal as="h2" kind="up" className="display contact__title">
        {t.profile.contactTitle}
      </Reveal>

      <Reveal as="p" kind="up" className="lead contact__lead">
        {t.profile.contactLead}
      </Reveal>

      {/* Two ways to start, side by side, and one file to take away. The pair
          is one reveal, not three: three reveals here would stagger a block
          the eye reads as a single object. */}
      <Reveal kind="up" className="contact__plate">
        <div className="contact__pair">
          <MailPlate />
          <WhatsPlate />
        </div>

        <CvButton />
      </Reveal>

      <Reveal kind="up" className="contact__channels">
        {profile.channels.map((channel) => (
          <a
            className="channel"
            key={channel.id}
            href={channel.href}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className="channel__label">
              <b>{channel.label}</b>
              <span>{channel.value}</span>
            </span>
            <ArrowUpRight />
          </a>
        ))}
      </Reveal>
    </section>
  );
}
