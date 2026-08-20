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

/** بعدها نعرض الحروف. وإن وصلت الصورة بعد ذلك فهي تفوز وتُعرض. */
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

  /* حالة واحدة، مالك واحد. لا onLoad ولا onError على العنصر: كلاهما فرع ثانٍ
     يقول نصف الحقيقة، وقد جرّبنا نصف الحقيقة. */
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    let alive = true;

    const settle = (next: "ready" | "failed") => {
      if (alive) setState(next);
    };

    /* أوّل حسم يفوز ويغلق الباب خلفه. الجولة 29 أخطأت هنا بالضبط: كان الحارس
       يُعلن الفشل بعد عشر ثوانٍ حتّى على صورة ظاهرة منذ الثانية الأولى، لأنّ شيئاً
       لم يكن يلغي المؤقّت عند النجاح. */
    let done = false;

    setState("loading");

    const timer = window.setTimeout(() => {
      if (!alive || done) return;
      done = true;
      if (import.meta.env.DEV) {
        console.warn("[portrait] تجاوز المهلة:", image.currentSrc || src);
      }
      settle("failed");
    }, PATIENCE_MS);

    const finish = (next: "ready" | "failed") => {
      if (!alive || done) return;
      done = true;
      window.clearTimeout(timer);
      settle(next);
    };

    image
      .decode()
      .then(() => {
        /* ملفّ تالف قد يُحَلّ وعرضه صفر. ليس نجاحاً. */
        if (image.naturalWidth === 0) finish("failed");
        else finish("ready");
      })
      .catch((error: DOMException) => {
        /* تغيّر المصدر أثناء الفكّ: ليس فشلاً، بل إلغاء. */
        if (error?.name === "AbortError") return;
        if (!alive || done) return;
        if (import.meta.env.DEV) {
          console.warn(
            "[portrait] تعذّر:",
            image.currentSrc || src,
            "—",
            error?.name ?? "decode",
          );
        }
        if (isLast) {
          finish("failed");
        } else {
          done = true;
          window.clearTimeout(timer);
          setIndex((current) => current + 1);
        }
      });

    return () => {
      alive = false;
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
              fetchPriority="high"
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
