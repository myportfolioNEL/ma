import type { Ref } from "react";
import { CV_DOC } from "../../data/cvDoc";
import type { CvBlock } from "../../data/cvDoc";
import type { Locale } from "../../data/translations";
import { cx } from "../../lib/utils";

/**
 * CvPaper - the curriculum vitae as a page of the site.
 *
 * WHY THIS EXISTS. The window used to embed the PDF and hand the drawing to the
 * browser's plugin, which refused inside a sandboxed frame, refused inside an
 * iframe in Safari, and showed one page on iOS. This component cannot refuse: it
 * is text in the document, so it always paints, it can be selected and searched
 * with the browser's own find, it scales as vector under the lens, and it costs
 * nothing over the network.
 *
 * WHY IT IS PRINT-SHAPED. The page is A4-proportioned with real paper margins,
 * because the reader is showing a document, not a web section. It is one
 * continuous column: the window scrolls it, so nothing is ever cut off, which
 * was the second complaint about the previous version.
 *
 * WHY THE MARKUP IS SEMANTIC. A heading is an h3, a definition list is a dl, an
 * entry's bullets are a ul. Screen readers read the CV in order, and the browser
 * can print it.
 */

type Props = {
  /** Which of the three documents to draw. */
  locale: Locale;
  /** Optional document object; defaults to CV_DOC[locale]. */
  doc?: typeof CV_DOC[Locale];
  /** The line at the foot of the page, from the interface language. */
  foot?: string;
  /** The lens clones this element, so the window has to be able to reach it. */
  paperRef?: Ref<HTMLElement>;
  ref?: Ref<HTMLElement>;
};

/* A line with no Arabic letters is set left-to-right even inside the Arabic
   document: e-mail, phone and domain names must not be reordered. .ltr already
   exists in base.css for exactly this. */
const latin = (line: string) => !/[\u0600-\u06FF]/.test(line);

function Block({ block }: { block: CvBlock }) {
  switch (block.kind) {
    case "section":
      return <h3 className="cvp__sec">{block.title}</h3>;
    case "lead":
      return <p className={cx("cvp__lead", latin(block.text) && "ltr")}>{block.text}</p>;
    case "terms":
      return (
        <dl className="cvp__terms">
          {block.items.map((item) => (
            <div className="cvp__pair" key={item.term}>
              <dt className={cx("cvp__term", latin(item.term) && "ltr")}>{item.term}</dt>
              <dd className={cx("cvp__def", latin(item.text) && "ltr")}>{item.text}</dd>
            </div>
          ))}
        </dl>
      );
    case "entry":
      return (
        <section className="cvp__entry">
          <h4 className={cx("cvp__title", latin(block.title) && "ltr")}>{block.title}</h4>
          <p className={cx("cvp__meta", latin(block.meta) && "ltr")}>{block.meta}</p>
          <ul className="cvp__list">
            {block.items.map((item) => (
              <li className={cx("cvp__item", latin(item) && "ltr")} key={item}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      );
  }
}

export function CvPaper({ locale, doc: propDoc, foot: propFoot, paperRef, ref }: Props) {
  const doc = propDoc ?? CV_DOC[locale];
  const foot = propFoot ?? "";
  const targetRef = ref ?? paperRef;
  return (
    <article
      className="cvp"
      /* The document carries its own language and direction, so the Arabic CV
         reads right-to-left inside an English interface and the French CV reads
         left-to-right inside an Arabic one. */
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      ref={targetRef}
    >
      <header className="cvp__head">
        <h2 className="cvp__name">{doc.name}</h2>
        <p className={cx("cvp__role", latin(doc.role) && "ltr")}>{doc.role}</p>
        {doc.contact.map((line) => (
          <p className={cx("cvp__contact", latin(line) && "ltr")} key={line}>
            {line}
          </p>
        ))}
      </header>

      <div className="cvp__body">
        {doc.blocks.map((block, index) => (
          <Block block={block} key={`${block.kind}-${index}`} />
        ))}
      </div>

      <footer className="cvp__foot">{foot}</footer>
    </article>
  );
}
export default CvPaper;
