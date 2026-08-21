import type { Locale } from "./translations";

/**
 * cv.ts - the CV files, one per interface language, and every place a copy of
 * them lives.
 *
 * TWO SOURCES, ON PURPOSE. The same three PDFs sit in two places:
 *
 *   local  - public/cv/cv-xx.pdf, shipped with the site by Vite.
 *   mirror - the nl-audio-cdn repository, which already serves this site's
 *            posters.
 *
 * Both are paths on the same GitHub Pages host as the portfolio itself, so
 * they are SAME ORIGIN: the download attribute is honoured, fetch() needs no
 * CORS header, and neither copy can be blocked by a cross-origin rule. The
 * browser asks both at once and keeps whichever answers first; lib/cv.ts owns
 * that race.
 *
 * WHY bytes IS DECLARED HERE. It is not decoration. A PDF that has been
 * written through a text channel instead of a binary one still begins with
 * %PDF-, still ends with %%EOF, and still opens in file(1) - it is simply
 * unreadable, and about fifty per cent larger, because every byte the channel
 * could not decode became three. That is exactly what happened to the copies
 * in public/cv/ before this round. The expected size is therefore a fingerprint
 * the browser can check in one line: a source whose file is the wrong size is
 * demoted and the other one is asked instead. scripts/audit-cv.mjs keeps these
 * numbers honest at build time, so they can never drift from the files on disk.
 *
 * WHY A VERSION QUERY, AND NOT A HASH. Everything Vite emits carries a content
 * hash, so a returning visitor gets it from cache and a new build invalidates
 * it automatically. Files under public/ are copied verbatim, so their URL is
 * stable forever, and GitHub Pages does not let this repository set
 * Cache-Control. The URL is the only cache handle available: change a PDF, bump
 * VERSION, and every browser fetches once.
 */

export type CvSourceKind = "local" | "mirror";

export type CvLocale = Locale;

export type CvSource = {
  kind: CvSourceKind;
  url: string;
};

export type CvFile = {
  locale: Locale;
  /** The only text the control shows: AR, EN, FR. */
  code: string;
  /** The name the browser saves it as. */
  fileName: string;
  /** Exact size on disk. Verified by scripts/audit-cv.mjs. */
  bytes: number;
  /** Every copy of this file, in preference order. */
  sources: CvSource[];
};

/** Bump this whenever a file in public/cv/ is replaced. */
const VERSION = "2026-08";

/** The repository that already serves this site's posters. Same host as the
    portfolio, so same origin. */
const MIRROR_BASE = "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/";

const CODES: Record<Locale, string> = {
  en: "EN",
  fr: "FR",
  ar: "AR",
};

const BYTES: Record<Locale, number> = {
  en: 54364,
  fr: 56322,
  ar: 124897,
};

function fileFor(locale: Locale): CvFile {
  return {
    locale,
    code: CODES[locale],
    fileName: `Noureddine-El-Mobaraki-CV-${CODES[locale]}.pdf`,
    bytes: BYTES[locale],
    sources: [
      { kind: "local", url: `./cv/cv-${locale}.pdf?v=${VERSION}` },
      { kind: "mirror", url: `${MIRROR_BASE}cv-${locale}.pdf?v=${VERSION}` },
    ],
  };
}

export const cv: Record<Locale, CvFile> = {
  en: fileFor("en"),
  fr: fileFor("fr"),
  ar: fileFor("ar"),
};

/** The order the three cells render in, left to right. */
export const CV_ORDER: Locale[] = ["ar", "en", "fr"];

export const cvVersion = VERSION;
export const cvMirrorBase = MIRROR_BASE;
