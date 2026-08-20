import type { Project } from "../types";

/**
 * projects.ts — the three shipped products, in display order.
 * Every number here was counted from the repositories, not estimated.
 * If a figure cannot be verified, it does not belong in this file.
 */

const projectsSource: Project[] = [
  {
    id: "nl",
    index: "01",
    name: "NL",
    kind: "Music & media platform",
    subtitle:
      "A six-theme media platform: audio engine, frame-locked lyrics, film library, retro desktop, accounts — in three languages.",
    year: "2025–26",
    context: "My own product, public since 2025",
    role: "Design, engineering and release",
    collaboration:
      "Run like a team repository: feature branches, pull requests, and required checks that block a merge until 227 tests pass. Every release gets notes, so the history explains itself to whoever reads it next.",
    timeline: "18 months, still shipping",
    scale: "63,786 lines · 189 components · 142 hooks",
    overview:
      "NL is the platform for my music project. It started as one page and grew into a system: a Web Audio playback engine, timestamped lyrics locked to the waveform, a film and series library, a retro cassette-radio world, a Windows-XP style desktop, guest and signed-in accounts, and six selectable themes — Midnight, Dark, Light, 8-Bit, Lite and Retro.",
    challenge:
      "Media apps break where people notice. Audio stutters between tracks. Lyrics drift half a second late. An Arabic layout quietly collapses the moment it mirrors. Fixing that properly meant owning the audio pipeline, the timing model and the localisation architecture rather than trusting a plugin to guess.",
    build: [
      "A Web Audio engine with gain-node crossfading, preloading and a state machine that survives rapid seeking and track changes without stutter or leaked nodes.",
      "An LRC lyric engine that parses timestamped files and drives highlighting from requestAnimationFrame instead of interval polling, so it cannot drift.",
      "A three-locale i18n layer (Arabic, English, French) with runtime switching, persisted preference and a fully mirrored RTL layout.",
      "Six themes as pure CSS custom-property sets, so switching costs one class change and zero re-render.",
      "A film, series and video library with search, filters, lazy posters and skeletons that reserve their own space so nothing shifts.",
      "An Express 5 service for what a static host cannot serve, deployed beside the GitHub Pages front end.",
      "Seven GitHub Actions pipelines: quality gates, end-to-end tests, Lighthouse budgets, CodeQL scanning, deploy, lockfile sync and scheduled content harvesting.",
    ],
    outcome: [
      "227 automated test cases across 46 files, run on every commit.",
      "Three locales shipped with complete RTL and no layout regressions.",
      "Playback holds sync through rapid seeking, track switching and backgrounded tabs.",
      "Eighteen months of feature work with no rewrite.",
    ],
    stack: [
      "React 19",
      "TypeScript 5.9",
      "Vite 6",
      "Tailwind CSS v4",
      "Web Audio API",
      "hls.js",
      "Zustand",
      "Framer Motion",
      "GSAP",
      "Express 5",
      "Supabase",
      "i18next",
      "Vitest",
      "Playwright",
      "GitHub Actions",
      "Lighthouse CI",
      "CodeQL",
      "Sentry",
    ],
    imageUrl: "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/NL.webp",
    /* NL is the deliberate exception to the two-image rule: the same screenshot
       serves as both the window art and the case-study image. It is shown whole
       and centred inside the window rather than cropped, because a cropped
       screenshot of an interface tells you less than no screenshot at all. */
    posterUrl: "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/NL.webp",
    posterFit: "contain",
    imageAlt: "The NL media platform home screen with theme selector",
    liveUrl: "https://noureddinelmobaraki-web.github.io/NL/",
    /* Live preview: the first screen, with the theme selector and its branches. */
    previewUrl: "https://noureddinelmobaraki-web.github.io/NL/",
    repoUrl: "https://github.com/noureddinelmobaraki-web",
  },
  {
    id: "prism",
    index: "02",
    name: "PRISM",
    kind: "Configurable art commerce",
    subtitle:
      "A digital-art gallery and store with a live configurator, a spatial wall visualiser, and a back end that costs nothing to run.",
    year: "2026",
    context: "Own product, built to take real orders",
    role: "Design and engineering",
    collaboration:
      "The pricing model, the performance baseline and the trade-offs I rejected are written down in the repository as decision records. Someone joining tomorrow starts from what I already learned instead of re-deriving it.",
    timeline: "5 months",
    scale: "28,821 lines · 46 components · 8 code-split sections",
    overview:
      "PRISM sells digital art as physical canvases. A visitor browses the gallery, previews a piece on a staged interior wall, configures size, finish, framing and multi-panel composition, watches the price update instantly, then submits an order with high-resolution references. There is no server behind it: a Google Apps Script endpoint writes to Drive and Sheets.",
    challenge:
      "Configurable commerce is where pricing logic rots. Every size, finish and panel count multiplies the combinations, and a single rounding disagreement between the preview and the invoice costs you the customer. On top of that, people upload enormous reference files, which a careless implementation either rejects outright or drops in silence.",
    build: [
      "One pure pricing module as the only source of truth: six size tiers, three finish multipliers and pack composition, computed in a single place and formatted for the local market.",
      "A live configurator where every option change recalculates and repaints the price with no server round trip.",
      "A spatial visualiser that composites a selected piece into staged room photography at the correct scale.",
      "An order pipeline with client-side image compression, an enforced payload ceiling, retry with backoff and explicit failure states.",
      "A Google Apps Script back end that receives orders, stores references in Drive, appends structured rows to Sheets and returns a confirmation.",
      "A build-time art catalogue emitted as a typed module, which removes runtime fetches and an entire class of loading states.",
      "Eight sections behind React.lazy, plus a written decision record and a tracked performance baseline.",
    ],
    outcome: [
      "281 kB gzipped JavaScript and 22 kB gzipped CSS across more than two thousand modules.",
      "Six-second production builds, measured against a recorded baseline.",
      "No pricing discrepancy between the configurator preview and the submitted order.",
      "No recurring infrastructure cost — the entire back end is serverless.",
    ],
    stack: [
      "React 19",
      "TypeScript 5.8",
      "Vite 6",
      "Tailwind CSS v4",
      "Motion",
      "Google Apps Script",
      "Build-time codegen",
      "WebP pipeline",
      "Playwright",
      "GitHub Actions",
      "CodeQL",
    ],
    imageUrl:
      "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/prism.webp",
    posterUrl:
      "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/BG.SITES/3.png",
    posterFit: "cover",
    imageAlt: "The PRISM gallery with a piece previewed on an interior wall",
    liveUrl: "https://prismmoo.github.io/ma/",
    /* Live preview: THE SHOW, the entry screen. */
    previewUrl: "https://prismmoo.github.io/ma/",
    repoUrl: "https://github.com/Prismmoo/ma",
  },
  {
    id: "momento",
    index: "03",
    name: "MOMENTO",
    kind: "Luxury retail boutique",
    subtitle:
      "A trilingual watch boutique built mobile-first, with a single-source price catalogue and WhatsApp checkout for the Moroccan market.",
    year: "2026",
    context: "Built for a watch retailer in Casablanca",
    role: "Design and engineering",
    collaboration:
      "The scope came from outside me, so the content had to stay outside the code: products, prices and Arabic copy live in one typed file a non-developer can review and correct without opening a component.",
    timeline: "3 months",
    scale: "8,809 lines · 21 components · 3 locales",
    overview:
      "MOMENTO is a boutique for a Casablanca watch retailer. A gender gate opens into men's and women's collections, every product has a detail page with a try-on view, and orders complete over WhatsApp — the channel this market actually uses — with a cart, a wishlist and a shipping-tariff calculator for every Moroccan city.",
    challenge:
      "A retail catalogue rots the moment a price exists in two places. This one also had to read correctly in Arabic, French and English, on a phone, in a market where the sale closes in a chat app rather than a card form.",
    build: [
      "A single typed catalogue module as the only source of truth for products, prices and statistics; every list and every total derives from it.",
      "A three-locale i18n layer (Arabic, French, English) with mirrored RTL layout, locale-aware currency and number formatting, and automatic detection.",
      "A mobile-first frame with drawers for cart and wishlist, modals for detail, search, try-on, concierge and shipping, all sharing one shell component.",
      "A WhatsApp order builder that serialises the cart into a structured, human-readable message.",
      "A shipping-tariff dataset covering Moroccan cities, surfaced inside the product flow.",
      "44 unit tests over pricing, catalogue integrity, navigation keys and translation completeness, plus Playwright journeys for the drawers, the carousel and language switching.",
    ],
    outcome: [
      "Three locales with full RTL, verified by tests that fail if a key is missing.",
      "One price source — a mismatch between a card and a cart is now impossible.",
      "Checkout completes in the channel the customer already uses.",
      "44 unit tests and 4 CI pipelines guarding every release.",
    ],
    stack: [
      "React 19",
      "TypeScript 5.8",
      "Vite 6",
      "Tailwind CSS v4",
      "Motion",
      "i18n + RTL",
      "Vitest",
      "Playwright",
      "GitHub Actions",
      "CodeQL",
    ],
    imageUrl:
      "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/MOMENTOBG.webp",
    posterUrl:
      "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/BG.SITES/2.png",
    posterFit: "cover",
    imageAlt: "The MOMENTO watch boutique collection screen",
    liveUrl: "https://momentowatch.github.io/ma/",
    /* Live preview: the men-or-women choice, the entry screen. */
    previewUrl: "https://momentowatch.github.io/ma/",
    repoUrl: "https://github.com/monentowatch/ma",
  },
];

/**
 * Display order, and the only place it is written.
 *
 * The three literals above stay in the order they were authored so the diff of
 * a reorder is one line instead of one hundred and eighty. What the visitor
 * sees is this list, and `index` is derived from the position in it, so the
 * number printed on a window (ProjectWindow.tsx), on a phone card
 * (ProjectCard.tsx) and at the top of a case study (CaseStudy.tsx,
 * CaseSheet.tsx) cannot disagree with the order ever again.
 *
 * MOMENTO leads because it is the most recent, it was built for a paying
 * retailer rather than for myself, and it closes a real sale on WhatsApp;
 * PRISM follows as the engineering piece; NL is last because it is the largest
 * and it holds attention longest once it is reached.
 */
const DISPLAY_ORDER = ["momento", "prism", "nl"] as const;

export const projects: Project[] = DISPLAY_ORDER.map((id, position) => {
  const source = projectsSource.find((project) => project.id === id);
  if (!source) {
    throw new Error(
      `projects.ts: DISPLAY_ORDER names an unknown project id "${id}"`,
    );
  }
  return { ...source, index: String(position + 1).padStart(2, "0") };
});
