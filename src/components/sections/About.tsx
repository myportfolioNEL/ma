import { useEffect, useMemo, useRef, useState } from "react";
import { profile } from "../../data/profile";
import { useLocale } from "../../context/LocaleContext";
import { gsap, prefersReducedMotion } from "../../lib/motion";
import { isMobile } from "../../lib/platform";
import SectionHead from "../ui/SectionHead";
import Reveal from "../ui/Reveal";

/**
 * About — الصورة الملتصقة بجانب النصّ.
 *
 * الإطار يملك النسبة، والصورة تُقصّ داخله. وثلاث حالات صريحة: انتظار، ونجاح،
 * وفشل.
 *
 * الحَكَم هنا هو decode() لا onLoad: هو ينتظر البايتات ثمّ يفكّها، فيُحَلّ عند
 * إمكان الرسم فعلاً، ويُرفَض عند الفشل باسم سبب. onLoad يخبرك أنّ شيئاً وصل،
 * لا أنّ شيئاً يُرسَم — والفرق بينهما هو ما أضاع أسبوعاً.
 */

/** بعدها نعرض الحروف — ثم إن وصلت الصورة تفوز وتُعرض. المهلة تبدأ عند الظهور. */
const PATIENCE_MS = 10000;

export default function About() {
  const { t } = useLocale();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  const sources = useMemo(() => {
    const list = profile.portraitSources?.length
      ? [...profile.portraitSources]
      : [profile.portraitUrl];
    /* المفضّل أولاً دائماً، ولو تكرّر في القائمة. */
    return [profile.portraitUrl, ...list.filter((s) => s !== profile.portraitUrl)];
  }, []);

  const src = sources[index] ?? sources[0];
  const isLast = index >= sources.length - 1;

  /* One state, one owner — but the clock now starts at the right moment.

     #about is a content-visibility:auto section, so at mount this <img> is
     inside a subtree the browser is not rendering. Calling decode() there and
     putting a ten-second stopwatch on it measures the section's distance from
     the viewport, not the network. The observer waits until the frame is real.

     And the promise this file has always made in its own comment is finally
     kept: if the picture arrives after the timer, it still wins. */
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    let alive = true;
    let settled = false;
    let timer = 0;

    setState("loading");

    const succeed = (): void => {
      if (!alive) return;
      settled = true;
      window.clearTimeout(timer);
      setState("ready");
    };

    const fail = (): void => {
      if (!alive || settled) return;
      settled = true;
      window.clearTimeout(timer);
      setState("failed");
    };

    /* The door stays open. A late arrival overrides a timed-out "failed". */
    const onLate = (): void => {
      if (!alive) return;
      if (image.naturalWidth > 0) succeed();
    };

    const attempt = (): void => {
      if (!alive) return;

      /* Already decoded and in the cache: no timer, no flash of letters. */
      if (image.complete && image.naturalWidth > 0) {
        succeed();
        return;
      }

      /* Show the letters rather than an empty frame — but do not close the
         door behind them. onLate can still promote this to "ready". */
      timer = window.setTimeout(() => {
        if (!alive || settled) return;
        if (import.meta.env.DEV) {
          console.warn("[portrait] slow, showing initials:", image.currentSrc || src);
        }
        setState("failed");
      }, PATIENCE_MS);

      image
        .decode()
        .then(() => {
          /* A corrupt file can resolve with a zero-width bitmap. Not success. */
          if (image.naturalWidth === 0) fail();
          else succeed();
        })
        .catch((error: DOMException) => {
          /* The source changed mid-decode: a cancellation, not a failure. */
          if (error?.name === "AbortError") return;
          if (!alive || settled) return;
          if (import.meta.env.DEV) {
            console.warn(
              "[portrait] failed:",
              image.currentSrc || src,
              "—",
              error?.name ?? "decode",
            );
          }
          if (isLast) {
            fail();
          } else {
            settled = true;
            window.clearTimeout(timer);
            setIndex((current) => current + 1);
          }
        });
    };

    image.addEventListener("load", onLate);

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        attempt();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(image);

    return () => {
      alive = false;
      observer.disconnect();
      image.removeEventListener("load", onLate);
      window.clearTimeout(timer);
    };
  }, [src, isLast]);

  /* تمرير الصورة: إزاحة فقط. لا scale ولا filter — كلاهما إعادة تنقيط في كل
     إطار. وعلى الهاتف لا تمرير أصلاً. */
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    if (prefersReducedMotion() || isMobile()) return;

    const tween = gsap.fromTo(
      image,
      { yPercent: -4 },
      {
        yPercent: 4,
        ease: "none",
        scrollTrigger: {
          trigger: image,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            image.style.willChange = self.isActive ? "transform" : "";
          },
        },
      },
    );

    return () => {
      image.style.willChange = "";
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section className="section" id="about">
      <SectionHead
        index="03 / About"
        title={t.sectionHeads.about.title}
        note={t.profile.aboutLead}
      />

      <div className="about__grid">
        <Reveal className="about__media" kind="clip">
          <figure
            className="portrait"
            data-state={state}
            data-source={index}
            style={
              {
                aspectRatio: profile.portraitRatio,
                "--portrait-focus": profile.portraitFocus,
              } as React.CSSProperties & Record<"--portrait-focus", string>
            }
          >
            <span className="portrait__skeleton" aria-hidden="true" />

            <img
              ref={imageRef}
              key={src}
              className="portrait__img"
              src={src}
              alt={profile.name}
              decoding="async"
              loading="eager"
              fetchPriority="auto"
            />

            <span className="portrait__fallback" aria-hidden="true">
              {profile.initials}
            </span>

            <span className="portrait__mat" aria-hidden="true" />
            <span className="portrait__tick portrait__tick--a" aria-hidden="true" />
            <span className="portrait__tick portrait__tick--b" aria-hidden="true" />

            <figcaption className="portrait__cap">
              <b className="ltr">{profile.name}</b>
              <span>{t.profile.roleLong}</span>
            </figcaption>
          </figure>
        </Reveal>

        <div>
          {t.profile.about.map((paragraph, order) => (
            <Reveal
              as="p"
              key={paragraph.slice(0, 24)}
              kind="up"
              delay={order * 0.04}
              className="prose"
            >
              {paragraph}
            </Reveal>
          ))}

          <Reveal as="dl" kind="up" className="about__facts">
            {t.profile.facts.map((fact) => (
              <div className="about__fact" key={fact.key}>
                <dt>{fact.key}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </Reveal>

          <Reveal kind="up" className="about__langs">
            {t.profile.languages.map((language) => (
              <span className="tag" key={language.name}>
                {language.name} · {language.level}
              </span>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
