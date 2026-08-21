import type { Locale } from "./translations";

/**
 * cvDoc - the curriculum vitae as typed data.
 *
 * WHY THE CV IS DATA AND NOT A RENDERED FILE. The reader used to point an
 * iframe at a blob: URL and let the browser's PDF plugin draw the page. That
 * plugin refuses to run inside a sandboxed frame, refuses to run inside an
 * iframe in Safari at all, and renders only the first page on iOS - so the
 * window was empty in exactly the places the site is looked at. A document the
 * site owns has none of those failure modes: it is DOM, so it always paints, it
 * scrolls like a page, it can be magnified without losing sharpness, and it
 * costs no network at all. The PDF files are still the deliverable - the plate
 * downloads them and the window links to them - but they are no longer the
 * rendering surface.
 *
 * WHY THE SHAPE IS A LIST OF BLOCKS. A CV is a sequence of headings, a lead
 * paragraph, definition pairs and dated entries with bullets. Four block kinds
 * cover the whole document in all three languages, so CvPaper is a switch over
 * four cases and the three locales are guaranteed to render identically. The
 * unit test asserts the three locales have the same block sequence, which is
 * the same discipline translations.test.ts already applies to the interface.
 *
 * WHY THE TEXT IS COPIED FROM THE PDFS. The files in scripts/cv-b64 are the
 * source of truth for what was sent to employers. This file must say the same
 * thing, or the reader and the download would disagree - the exact class of bug
 * the pricing and catalogue modules in the projects below were built to prevent.
 */

export type CvBlock =
  | { readonly kind: "section"; readonly title: string }
  | { readonly kind: "lead"; readonly text: string }
  | {
      readonly kind: "terms";
      readonly items: ReadonlyArray<{ readonly term: string; readonly text: string }>;
    }
  | {
      readonly kind: "entry";
      readonly title: string;
      readonly meta: string;
      readonly items: ReadonlyArray<string>;
    };

export type CvPaperDoc = {
  readonly name: string;
  readonly role: string;
  /** One line per row under the name. Latin-only lines are marked .ltr by CvPaper. */
  readonly contact: ReadonlyArray<string>;
  readonly blocks: ReadonlyArray<CvBlock>;
};

const en: CvPaperDoc = {
  name: "Noureddine El Mobaraki",
  role: "Front-End Engineer \u2014 React, TypeScript, Vite",
  contact: [
    "Casablanca, Morocco (remote-friendly) \u00b7 +212 612-806932 \u00b7 noureddinelmobaraki@gmail.com",
    "Portfolio: noureddinelmobaraki-web.github.io/portfolio \u00b7 GitHub: github.com/noureddinelmobaraki-web",
  ],
  blocks: [
    { kind: "section", title: "Summary" },
    {
      kind: "lead",
      text: "Front-end engineer who ships web products end to end: interface, motion, state, tests and release. Self-taught since 2021, with three products live in production, each trilingual (Arabic, French, English) with fully mirrored RTL. Built solo under team discipline: feature branches, pull requests, code review, and CI gates that refuse a red build. Comfortable owning a codebase and comfortable joining one.",
    },
    { kind: "section", title: "Skills" },
    {
      kind: "terms",
      items: [
        {
          term: "Core",
          text: "TypeScript, JavaScript (ES2022), HTML, CSS, accessibility (WCAG 2.1 AA)",
        },
        {
          term: "Frameworks",
          text: "React 19, Vite 6, Tailwind CSS v4, Zustand, React Context, i18next",
        },
        {
          term: "Interface and motion",
          text: "design systems in CSS custom properties, GSAP and ScrollTrigger, WebGL and GLSL shaders, Lenis, reduced-motion and device-quality budgets",
        },
        {
          term: "Platform",
          text: "Node.js, Express 5, Supabase, Google Apps Script, Web Audio API, hls.js, WebP image pipelines",
        },
        {
          term: "Quality and delivery",
          text: "Vitest, Playwright, GitHub Actions, CodeQL, Lighthouse CI, Sentry, decision records",
        },
        {
          term: "Internationalisation",
          text: "Arabic, French and English interfaces, RTL mirroring, locale-aware number and currency formatting",
        },
      ],
    },
    { kind: "section", title: "Experience" },
    {
      kind: "entry",
      title: "Independent Front-End Engineer \u2014 own products and client work",
      meta: "Casablanca, Morocco \u00b7 2021 \u2013 present",
      items: [
        "Designed, built and released three production web products: 101,416 lines of code and 256 React components, counted across the three repositories in August 2026.",
        "Wrote and maintained 302 automated tests in Vitest and Playwright, enforced by 15 CI pipelines covering quality gates, end-to-end journeys, Lighthouse budgets, CodeQL scanning and deployment.",
        "Delivered every product in Arabic, French and English with mirrored RTL layouts, protected by tests that fail the build when a translation key is missing in any locale.",
        "Ran solo work like team work: branch, pull request, review before merge, release notes, and a written decision record for every trade-off worth remembering.",
      ],
    },
    { kind: "section", title: "Selected projects" },
    {
      kind: "entry",
      title: "MOMENTO \u2014 trilingual watch boutique, built for a Casablanca retailer",
      meta: "2026 \u00b7 Design and engineering \u00b7 momentowatch.github.io/ma",
      items: [
        "Made one typed catalogue module the only source of truth for products, prices and statistics, so a price mismatch between a product card, the cart and the order became impossible.",
        "Built WhatsApp checkout that serialises the cart into a structured, human-readable message, matching the channel this market actually closes sales in, plus a shipping-tariff dataset for Moroccan cities.",
        "Shipped 8,809 lines and 21 components with 44 unit tests and 4 CI pipelines; three locales with full RTL and locale-aware currency formatting.",
      ],
    },
    {
      kind: "entry",
      title: "PRISM \u2014 configurable digital-art commerce",
      meta: "2026 \u00b7 Own product \u00b7 Design and engineering \u00b7 prismmoo.github.io/ma",
      items: [
        "Wrote one pure pricing module (six size tiers, three finish multipliers, multi-panel packs) as the single source of truth, so the configurator preview and the submitted order can never disagree.",
        "Built a spatial wall visualiser and an order pipeline with client-side image compression, an enforced payload ceiling, retry with backoff and explicit failure states.",
        "Shipped 281 kB gzipped JavaScript and 22 kB gzipped CSS across more than 2,000 modules, six-second production builds against a recorded baseline, and a serverless Apps Script back end with no recurring cost.",
      ],
    },
    {
      kind: "entry",
      title: "NL \u2014 music and media platform",
      meta: "2025 \u2013 2026 \u00b7 Own product \u00b7 Design, engineering and release \u00b7 noureddinelmobaraki-web.github.io/NL",
      items: [
        "Built a Web Audio playback engine with gain-node crossfading, preloading and a state machine that survives rapid seeking and track changes without stutter or leaked nodes.",
        "Drove timestamped LRC lyrics from requestAnimationFrame rather than interval polling, so highlighting cannot drift from the waveform; added six themes as pure CSS custom-property sets, switched with one class and zero re-render.",
        "Shipped 63,786 lines, 189 components and 142 hooks with 227 tests across 46 files and 7 CI pipelines, plus an Express 5 service beside the static front end.",
      ],
    },
    { kind: "section", title: "Education" },
    {
      kind: "lead",
      text: "Self-taught front-end engineer, 2021 to present. Learned by shipping production software and then maintaining it: performance budgets, accessibility, internationalisation and continuous integration learned on products that real users depend on.",
    },
    { kind: "section", title: "Languages" },
    {
      kind: "lead",
      text: "Arabic (native) \u00b7 Tamazight (native) \u00b7 English (professional) \u00b7 French (conversational)",
    },
    { kind: "section", title: "Availability" },
    {
      kind: "lead",
      text: "Open to full-time team roles, contract and freelance work. Based in Casablanca, comfortable working remotely.",
    },
  ],
};

const fr: CvPaperDoc = {
  name: "Noureddine El Mobaraki",
  role: "D\u00e9veloppeur front-end \u2014 React, TypeScript, Vite",
  contact: [
    "Casablanca, Maroc (ouvert au t\u00e9l\u00e9travail) \u00b7 +212 612-806932 \u00b7 noureddinelmobaraki@gmail.com",
    "Portfolio : noureddinelmobaraki-web.github.io/portfolio \u00b7 GitHub : github.com/noureddinelmobaraki-web",
  ],
  blocks: [
    { kind: "section", title: "Profil" },
    {
      kind: "lead",
      text: "D\u00e9veloppeur front-end qui livre des produits web de bout en bout : interface, animation, \u00e9tat, tests et mise en production. Autodidacte depuis 2021, avec trois produits en ligne, chacun trilingue (arabe, fran\u00e7ais, anglais) et enti\u00e8rement adapt\u00e9 au sens RTL. Travail en solo mais avec une discipline d\u2019\u00e9quipe : branches de fonctionnalit\u00e9, pull requests, revue de code et pipelines CI qui bloquent une build en \u00e9chec.",
    },
    { kind: "section", title: "Comp\u00e9tences" },
    {
      kind: "terms",
      items: [
        {
          term: "Fondamentaux",
          text: "TypeScript, JavaScript (ES2022), HTML, CSS, accessibilit\u00e9 (WCAG 2.1 AA)",
        },
        {
          term: "Frameworks",
          text: "React 19, Vite 6, Tailwind CSS v4, Zustand, React Context, i18next",
        },
        {
          term: "Interface et animation",
          text: "design systems en variables CSS, GSAP et ScrollTrigger, WebGL et shaders GLSL, Lenis, budgets de mouvement r\u00e9duit et de qualit\u00e9 par appareil",
        },
        {
          term: "Plateforme",
          text: "Node.js, Express 5, Supabase, Google Apps Script, Web Audio API, hls.js, pipelines d\u2019images WebP",
        },
        {
          term: "Qualit\u00e9 et livraison",
          text: "Vitest, Playwright, GitHub Actions, CodeQL, Lighthouse CI, Sentry, registres de d\u00e9cisions",
        },
        {
          term: "Internationalisation",
          text: "interfaces en arabe, fran\u00e7ais et anglais, mise en miroir RTL, formats de nombres et de devises localis\u00e9s",
        },
      ],
    },
    { kind: "section", title: "Exp\u00e9rience" },
    {
      kind: "entry",
      title: "D\u00e9veloppeur front-end ind\u00e9pendant \u2014 produits personnels et travail client",
      meta: "Casablanca, Maroc \u00b7 2021 \u2013 aujourd\u2019hui",
      items: [
        "Con\u00e7u, d\u00e9velopp\u00e9 et mis en production trois produits web : 101 416 lignes de code et 256 composants React, compt\u00e9s dans les trois d\u00e9p\u00f4ts en ao\u00fbt 2026.",
        "\u00c9crit et maintenu 302 tests automatis\u00e9s (Vitest, Playwright), impos\u00e9s par 15 pipelines CI : contr\u00f4les qualit\u00e9, parcours de bout en bout, budgets Lighthouse, analyse CodeQL et d\u00e9ploiement.",
        "Livr\u00e9 chaque produit en arabe, fran\u00e7ais et anglais avec une mise en page enti\u00e8rement invers\u00e9e en RTL, prot\u00e9g\u00e9e par des tests qui font \u00e9chouer la build d\u00e8s qu\u2019une cl\u00e9 de traduction manque.",
        "Men\u00e9 un travail solo comme un travail d\u2019\u00e9quipe : branche, pull request, revue avant fusion, notes de version et une d\u00e9cision \u00e9crite pour chaque compromis important.",
      ],
    },
    { kind: "section", title: "Projets s\u00e9lectionn\u00e9s" },
    {
      kind: "entry",
      title: "MOMENTO \u2014 boutique horlog\u00e8re trilingue, r\u00e9alis\u00e9e pour un revendeur de Casablanca",
      meta: "2026 \u00b7 Conception et d\u00e9veloppement \u00b7 momentowatch.github.io/ma",
      items: [
        "Un seul module de catalogue typ\u00e9 comme source unique de v\u00e9rit\u00e9 pour les produits, les prix et les statistiques : un \u00e9cart de prix entre la fiche, le panier et la commande devient impossible.",
        "Commande via WhatsApp : le panier est s\u00e9rialis\u00e9 en un message structur\u00e9 et lisible, dans le canal o\u00f9 ce march\u00e9 conclut r\u00e9ellement ses ventes, avec un bar\u00e8me de livraison pour les villes marocaines.",
        "8 809 lignes, 21 composants, 44 tests unitaires et 4 pipelines CI ; trois langues avec RTL complet et formats mon\u00e9taires localis\u00e9s.",
      ],
    },
    {
      kind: "entry",
      title: "PRISM \u2014 commerce d\u2019art num\u00e9rique configurable",
      meta: "2026 \u00b7 Produit personnel \u00b7 Conception et d\u00e9veloppement \u00b7 prismmoo.github.io/ma",
      items: [
        "Un module de tarification pur (six tailles, trois finitions, compositions multi-panneaux) comme source unique de v\u00e9rit\u00e9 : l\u2019aper\u00e7u du configurateur et la commande envoy\u00e9e ne peuvent plus jamais diverger.",
        "Visualiseur spatial sur photographie d\u2019int\u00e9rieur et cha\u00eene de commande avec compression d\u2019images c\u00f4t\u00e9 client, plafond de charge impos\u00e9, reprise avec backoff et \u00e9tats d\u2019erreur explicites.",
        "281 ko de JavaScript et 22 ko de CSS compress\u00e9s sur plus de 2 000 modules, builds de production en six secondes face \u00e0 une r\u00e9f\u00e9rence enregistr\u00e9e, back end serverless sans co\u00fbt r\u00e9current.",
      ],
    },
    {
      kind: "entry",
      title: "NL \u2014 plateforme de musique et de m\u00e9dias",
      meta: "2025 \u2013 2026 \u00b7 Produit personnel \u00b7 Conception, d\u00e9veloppement et mise en production \u00b7 noureddinelmobaraki-web.github.io/NL",
      items: [
        "Moteur de lecture Web Audio avec fondu encha\u00een\u00e9 par gain nodes, pr\u00e9chargement et machine \u00e0 \u00e9tats qui r\u00e9siste aux changements de piste rapides, sans coupure ni n\u0153ud abandonn\u00e9.",
        "Paroles LRC horodat\u00e9es pilot\u00e9es par requestAnimationFrame plut\u00f4t que par intervalles : la surbrillance ne peut pas d\u00e9river ; six th\u00e8mes en variables CSS, chang\u00e9s par une classe et sans re-render.",
        "63 786 lignes, 189 composants, 142 hooks, 227 tests dans 46 fichiers et 7 pipelines CI, plus un service Express 5 \u00e0 c\u00f4t\u00e9 du front statique.",
      ],
    },
    { kind: "section", title: "Formation" },
    {
      kind: "lead",
      text: "Autodidacte en d\u00e9veloppement front-end depuis 2021. Appris en livrant du logiciel en production puis en le maintenant : performance, accessibilit\u00e9, internationalisation et int\u00e9gration continue apprises sur des produits utilis\u00e9s par de vrais utilisateurs.",
    },
    { kind: "section", title: "Langues" },
    {
      kind: "lead",
      text: "Arabe (langue maternelle) \u00b7 Tamazight (langue maternelle) \u00b7 Anglais (professionnel) \u00b7 Fran\u00e7ais (conversationnel)",
    },
    { kind: "section", title: "Disponibilit\u00e9" },
    {
      kind: "lead",
      text: "Ouvert \u00e0 un poste \u00e0 temps plein en \u00e9quipe, \u00e0 des missions et \u00e0 du freelance. Bas\u00e9 \u00e0 Casablanca, \u00e0 l\u2019aise en t\u00e9l\u00e9travail.",
    },
  ],
};

const ar: CvPaperDoc = {
  name: "\u0646\u0648\u0631 \u0627\u0644\u062f\u064a\u0646 \u0627\u0644\u0645\u0628\u0627\u0631\u0643\u064a",
  role: "\u0645\u0647\u0646\u062f\u0633 \u0648\u0627\u062c\u0647\u0627\u062a \u0623\u0645\u0627\u0645\u064a\u0629 \u2014 React \u0648 TypeScript \u0648 Vite",
  contact: [
    "\u0627\u0644\u062f\u0627\u0631 \u0627\u0644\u0628\u064a\u0636\u0627\u0621\u060c \u0627\u0644\u0645\u063a\u0631\u0628 (\u0645\u0646\u0641\u062a\u062d \u0639\u0644\u0649 \u0627\u0644\u0639\u0645\u0644 \u0639\u0646 \u0628\u0639\u062f) \u00b7 +212 612-806932 \u00b7 noureddinelmobaraki@gmail.com",
    "\u0627\u0644\u0645\u0648\u0642\u0639: noureddinelmobaraki-web.github.io/portfolio \u00b7 GitHub: github.com/noureddinelmobaraki-web",
  ],
  blocks: [
    { kind: "section", title: "\u0627\u0644\u0645\u0644\u062e\u0651\u0635" },
    {
      kind: "lead",
      text: "\u0645\u0647\u0646\u062f\u0633 \u0648\u0627\u062c\u0647\u0627\u062a \u0623\u0645\u0627\u0645\u064a\u0629 \u064a\u0628\u0646\u064a \u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0648\u064a\u0628 \u0645\u0646 \u0623\u0648\u0651\u0644\u0647\u0627 \u0625\u0644\u0649 \u0622\u062e\u0631\u0647\u0627: \u0627\u0644\u0648\u0627\u062c\u0647\u0629\u060c \u0648\u0627\u0644\u062d\u0631\u0643\u0629\u060c \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0627\u0644\u0629\u060c \u0648\u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a\u060c \u0648\u0627\u0644\u0625\u0635\u062f\u0627\u0631. \u0645\u062a\u0639\u0644\u0651\u0645 \u0628\u0630\u0627\u062a\u0647 \u0645\u0646\u0630 2021\u060c \u0648\u0644\u0647 \u062b\u0644\u0627\u062b\u0629 \u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0646\u0634\u0648\u0631\u0629 \u0648\u062a\u0639\u0645\u0644\u060c \u0643\u0644\u0651 \u0648\u0627\u062d\u062f \u0645\u0646\u0647\u0627 \u0628\u062b\u0644\u0627\u062b \u0644\u063a\u0627\u062a (\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0648\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629 \u0648\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629) \u0628\u062a\u062e\u0637\u064a\u0637 \u0645\u0639\u0643\u0648\u0633 \u0643\u0627\u0645\u0644\u064b\u0627 \u0644\u0644\u0627\u062a\u062c\u0627\u0647 \u0645\u0646 \u0627\u0644\u064a\u0645\u064a\u0646 \u0625\u0644\u0649 \u0627\u0644\u064a\u0633\u0627\u0631. \u0639\u0645\u0644 \u0641\u0631\u062f\u064a \u0628\u0627\u0646\u062a\u0638\u0627\u0645 \u0641\u0631\u064a\u0642: \u0641\u0631\u0648\u0639 \u0644\u0644\u0645\u064a\u0632\u0627\u062a\u060c \u0648\u0637\u0644\u0628\u0627\u062a \u062f\u0645\u062c\u060c \u0648\u0645\u0631\u0627\u062c\u0639\u0629 \u0642\u0628\u0644 \u0627\u0644\u062f\u0645\u062c\u060c \u0648\u0628\u0648\u0627\u0628\u0627\u062a \u062a\u0643\u0627\u0645\u0644 \u0645\u0633\u062a\u0645\u0631\u0651 \u062a\u0631\u0641\u0636 \u0623\u064a \u0628\u0646\u0627\u0621 \u0641\u0627\u0634\u0644.",
    },
    { kind: "section", title: "\u0627\u0644\u0645\u0647\u0627\u0631\u0627\u062a" },
    {
      kind: "terms",
      items: [
        {
          term: "\u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0627\u062a",
          text: "TypeScript\u060c JavaScript (ES2022)\u060c HTML\u060c CSS\u060c \u0625\u0645\u0643\u0627\u0646\u064a\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 (WCAG 2.1 AA)",
        },
        {
          term: "\u0623\u064f\u0637\u0631 \u0627\u0644\u0639\u0645\u0644",
          text: "React 19\u060c Vite 6\u060c Tailwind CSS v4\u060c Zustand\u060c React Context\u060c i18next",
        },
        {
          term: "\u0627\u0644\u0648\u0627\u062c\u0647\u0629 \u0648\u0627\u0644\u062d\u0631\u0643\u0629",
          text: "\u0623\u0646\u0637\u0645\u0629 \u062a\u0635\u0645\u064a\u0645 \u0639\u0628\u0631 \u0645\u062a\u063a\u064a\u0651\u0631\u0627\u062a CSS\u060c GSAP \u0648 ScrollTrigger\u060c WebGL \u0648 GLSL\u060c Lenis\u060c \u0648\u0645\u064a\u0632\u0627\u0646\u064a\u0627\u062a \u062d\u0631\u0643\u0629 \u062a\u062d\u062a\u0631\u0645 \u062a\u0641\u0636\u064a\u0644 \u062a\u0642\u0644\u064a\u0644 \u0627\u0644\u062d\u0631\u0643\u0629 \u0648\u0642\u062f\u0631\u0629 \u0627\u0644\u062c\u0647\u0627\u0632",
        },
        {
          term: "\u0627\u0644\u0645\u0646\u0635\u0651\u0629",
          text: "Node.js\u060c Express 5\u060c Supabase\u060c Google Apps Script\u060c Web Audio API\u060c hls.js\u060c \u0648\u062e\u0637\u0648\u0637 \u0645\u0639\u0627\u0644\u062c\u0629 \u0635\u0648\u0631 WebP",
        },
        {
          term: "\u0627\u0644\u062c\u0648\u062f\u0629 \u0648\u0627\u0644\u062a\u0633\u0644\u064a\u0645",
          text: "Vitest\u060c Playwright\u060c GitHub Actions\u060c CodeQL\u060c Lighthouse CI\u060c Sentry\u060c \u0648\u0633\u062c\u0644\u0651\u0627\u062a \u0642\u0631\u0627\u0631\u0627\u062a \u0645\u0643\u062a\u0648\u0628\u0629",
        },
        {
          term: "\u0627\u0644\u062a\u0639\u0631\u064a\u0628 \u0648\u062a\u0639\u062f\u0651\u062f \u0627\u0644\u0644\u063a\u0627\u062a",
          text: "\u0648\u0627\u062c\u0647\u0627\u062a \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0648\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629 \u0648\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629\u060c \u0648\u0627\u0646\u0639\u0643\u0627\u0633 \u0643\u0627\u0645\u0644 \u0644\u0644\u0627\u062a\u062c\u0627\u0647\u060c \u0648\u062a\u0646\u0633\u064a\u0642 \u0623\u0631\u0642\u0627\u0645 \u0648\u0639\u0645\u0644\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u0644\u063a\u0629",
        },
      ],
    },
    { kind: "section", title: "\u0627\u0644\u062e\u0628\u0631\u0629" },
    {
      kind: "entry",
      title: "\u0645\u0647\u0646\u062f\u0633 \u0648\u0627\u062c\u0647\u0627\u062a \u0623\u0645\u0627\u0645\u064a\u0629 \u0645\u0633\u062a\u0642\u0644 \u2014 \u0645\u0646\u062a\u062c\u0627\u062a \u062e\u0627\u0635\u0651\u0629 \u0648\u0639\u0645\u0644 \u0644\u062d\u0633\u0627\u0628 \u0639\u0645\u0644\u0627\u0621",
      meta: "\u0627\u0644\u062f\u0627\u0631 \u0627\u0644\u0628\u064a\u0636\u0627\u0621\u060c \u0627\u0644\u0645\u063a\u0631\u0628 \u00b7 2021 \u2013 \u0627\u0644\u0622\u0646",
      items: [
        "\u062a\u0635\u0645\u064a\u0645 \u0648\u0628\u0646\u0627\u0621 \u0648\u0625\u0635\u062f\u0627\u0631 \u062b\u0644\u0627\u062b\u0629 \u0645\u0646\u062a\u062c\u0627\u062a \u0648\u064a\u0628 \u0641\u064a \u0627\u0644\u0625\u0646\u062a\u0627\u062c: 101,416 \u0633\u0637\u0631 \u0643\u0648\u062f \u0648256 \u0645\u0643\u0648\u0651\u0646 React\u060c \u0645\u062d\u0633\u0648\u0628\u0629 \u0641\u064a \u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639\u0627\u062a \u0627\u0644\u062b\u0644\u0627\u062b\u0629 \u0641\u064a \u0623\u063a\u0633\u0637\u0633 2026.",
        "\u0643\u062a\u0627\u0628\u0629 \u0648\u0635\u064a\u0627\u0646\u0629 302 \u0627\u062e\u062a\u0628\u0627\u0631 \u0622\u0644\u064a \u0639\u0628\u0631 Vitest \u0648 Playwright\u060c \u062a\u0641\u0631\u0636\u0647\u0627 15 \u062e\u0637\u0651 \u062a\u0643\u0627\u0645\u0644 \u0645\u0633\u062a\u0645\u0631\u0651: \u0628\u0648\u0627\u0628\u0627\u062a \u062c\u0648\u062f\u0629\u060c \u0648\u0645\u0633\u0627\u0631\u0627\u062a \u0634\u0627\u0645\u0644\u0629\u060c \u0648\u0645\u064a\u0632\u0627\u0646\u064a\u0627\u062a Lighthouse\u060c \u0648\u062a\u062d\u0644\u064a\u0644 CodeQL\u060c \u0648\u0627\u0644\u0646\u0634\u0631.",
        "\u062a\u0633\u0644\u064a\u0645 \u0643\u0644 \u0645\u0646\u062a\u062c \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0648\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629 \u0648\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0645\u0639 \u062a\u062e\u0637\u064a\u0637 \u0645\u0639\u0643\u0648\u0633 \u0643\u0627\u0645\u0644\u064b\u0627\u060c \u062a\u062d\u0645\u064a\u0647 \u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a \u062a\u064f\u0641\u0634\u0644 \u0627\u0644\u0628\u0646\u0627\u0621 \u0625\u0630\u0627 \u063a\u0627\u0628 \u0645\u0641\u062a\u0627\u062d \u062a\u0631\u062c\u0645\u0629 \u0641\u064a \u0623\u064a \u0644\u063a\u0629.",
        "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0641\u0631\u062f\u064a \u0643\u0639\u0645\u0644 \u0641\u0631\u064a\u0642: \u0641\u0631\u0639\u060c \u0648\u0637\u0644\u0628 \u062f\u0645\u062c\u060c \u0648\u0645\u0631\u0627\u062c\u0639\u0629 \u0642\u0628\u0644 \u0627\u0644\u062f\u0645\u062c\u060c \u0648\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0625\u0635\u062f\u0627\u0631\u060c \u0648\u0642\u0631\u0627\u0631 \u0645\u0643\u062a\u0648\u0628 \u0644\u0643\u0644 \u0645\u0642\u0627\u064a\u0636\u0629 \u062a\u0633\u062a\u062d\u0642\u0651 \u0627\u0644\u062a\u0630\u0643\u0651\u0631.",
      ],
    },
    { kind: "section", title: "\u0645\u0634\u0627\u0631\u064a\u0639 \u0645\u062e\u062a\u0627\u0631\u0629" },
    {
      kind: "entry",
      title: "MOMENTO \u2014 \u0645\u062a\u062c\u0631 \u0633\u0627\u0639\u0627\u062a \u0628\u062b\u0644\u0627\u062b \u0644\u063a\u0627\u062a\u060c \u0628\u064f\u0646\u064a \u0644\u062a\u0627\u062c\u0631 \u0641\u064a \u0627\u0644\u062f\u0627\u0631 \u0627\u0644\u0628\u064a\u0636\u0627\u0621",
      meta: "2026 \u00b7 \u062a\u0635\u0645\u064a\u0645 \u0648\u0647\u0646\u062f\u0633\u0629 \u00b7 momentowatch.github.io/ma",
      items: [
        "\u0648\u062d\u062f\u0629 \u0643\u062a\u0627\u0644\u0648\u062c \u0648\u0627\u062d\u062f\u0629 \u0645\u0643\u062a\u0648\u0628\u0629 \u0627\u0644\u0623\u0646\u0648\u0627\u0639 \u0643\u0645\u0635\u062f\u0631 \u0648\u062d\u064a\u062f \u0644\u0644\u062d\u0642\u064a\u0642\u0629 \u0641\u064a \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u0625\u062d\u0635\u0627\u0621\u0627\u062a\u060c \u0641\u0635\u0627\u0631 \u0627\u062e\u062a\u0644\u0627\u0641 \u0627\u0644\u0633\u0639\u0631 \u0628\u064a\u0646 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u0646\u062a\u062c \u0648\u0627\u0644\u0633\u0644\u0651\u0629 \u0648\u0627\u0644\u0637\u0644\u0628 \u0645\u0633\u062a\u062d\u064a\u0644\u064b\u0627.",
        "\u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u0637\u0644\u0628 \u0639\u0628\u0631 \u0648\u0627\u062a\u0633\u0627\u0628: \u062a\u064f\u062d\u0648\u0651\u0644 \u0627\u0644\u0633\u0644\u0651\u0629 \u0625\u0644\u0649 \u0631\u0633\u0627\u0644\u0629 \u0645\u0646\u0638\u0651\u0645\u0629 \u064a\u0642\u0631\u0623\u0647\u0627 \u0627\u0644\u0625\u0646\u0633\u0627\u0646\u060c \u0641\u064a \u0627\u0644\u0642\u0646\u0627\u0629 \u0627\u0644\u062a\u064a \u064a\u064f\u063a\u0644\u0642 \u0641\u064a\u0647\u0627 \u0647\u0630\u0627 \u0627\u0644\u0633\u0648\u0642 \u0628\u064a\u0639\u0647 \u0641\u0639\u0644\u064b\u0627\u060c \u0645\u0639 \u062c\u062f\u0648\u0644 \u0623\u0633\u0639\u0627\u0631 \u062a\u0648\u0635\u064a\u0644 \u0644\u0645\u062f\u0646 \u0627\u0644\u0645\u063a\u0631\u0628.",
        "8,809 \u0633\u0637\u0631 \u064821 \u0645\u0643\u0648\u0651\u0646\u064b\u0627 \u064844 \u0627\u062e\u062a\u0628\u0627\u0631 \u0648\u062d\u062f\u0629 \u06484 \u062e\u0637\u0648\u0637 \u062a\u0643\u0627\u0645\u0644 \u0645\u0633\u062a\u0645\u0631\u0651\u061b \u0648\u062b\u0644\u0627\u062b \u0644\u063a\u0627\u062a \u0628\u0627\u062a\u062c\u0627\u0647 \u0645\u0639\u0643\u0648\u0633 \u0643\u0627\u0645\u0644 \u0648\u062a\u0646\u0633\u064a\u0642 \u0639\u0645\u0644\u0629 \u0645\u062d\u0644\u0651\u064a.",
      ],
    },
    {
      kind: "entry",
      title: "PRISM \u2014 \u062a\u062c\u0627\u0631\u0629 \u0641\u0646\u0651 \u0631\u0642\u0645\u064a \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062a\u0647\u064a\u0626\u0629",
      meta: "2026 \u00b7 \u0645\u0646\u062a\u062c \u062e\u0627\u0635\u0651 \u00b7 \u062a\u0635\u0645\u064a\u0645 \u0648\u0647\u0646\u062f\u0633\u0629 \u00b7 prismmoo.github.io/ma",
      items: [
        "\u0648\u062d\u062f\u0629 \u062a\u0633\u0639\u064a\u0631 \u062e\u0627\u0644\u0635\u0629 (\u0633\u062a\u0651 \u0645\u0642\u0627\u0633\u0627\u062a\u060c \u0648\u062b\u0644\u0627\u062b \u0645\u0639\u0627\u0644\u062c\u0627\u062a \u0633\u0637\u062d\u060c \u0648\u062a\u0631\u0643\u064a\u0628\u0627\u062a \u0645\u062a\u0639\u062f\u0651\u062f\u0629 \u0627\u0644\u0623\u0644\u0648\u0627\u062d) \u0643\u0645\u0635\u062f\u0631 \u0648\u062d\u064a\u062f \u0644\u0644\u062d\u0642\u064a\u0642\u0629\u060c \u0641\u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u062e\u062a\u0644\u0641 \u0645\u0627 \u064a\u0631\u0627\u0647 \u0627\u0644\u0639\u0645\u064a\u0644 \u0641\u064a \u0627\u0644\u0645\u0647\u064a\u0651\u0626 \u0639\u0645\u0651\u0627 \u064a\u064f\u0631\u0633\u0644 \u0641\u064a \u0627\u0644\u0637\u0644\u0628.",
        "\u0639\u0627\u0631\u0636 \u0645\u0643\u0627\u0646\u064a \u064a\u0631\u0643\u0651\u0628 \u0627\u0644\u0639\u0645\u0644 \u0639\u0644\u0649 \u0635\u0648\u0631 \u063a\u0631\u0641 \u062d\u0642\u064a\u0642\u064a\u0629 \u0628\u0627\u0644\u0645\u0642\u064a\u0627\u0633 \u0627\u0644\u0635\u062d\u064a\u062d\u060c \u0648\u062e\u0637\u0651 \u0637\u0644\u0628\u0627\u062a \u0628\u0636\u063a\u0637 \u0627\u0644\u0635\u0648\u0631 \u0641\u064a \u0627\u0644\u0645\u062a\u0635\u0641\u0651\u062d\u060c \u0648\u0633\u0642\u0641 \u062d\u062c\u0645 \u0645\u0641\u0631\u0648\u0636\u060c \u0648\u0625\u0639\u0627\u062f\u0629 \u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u062a\u0628\u0627\u0639\u062f\u0629\u060c \u0648\u062d\u0627\u0644\u0627\u062a \u0641\u0634\u0644 \u0635\u0631\u064a\u062d\u0629.",
        "281 \u0643\u064a\u0644\u0648\u0628\u0627\u064a\u062a JavaScript \u064822 \u0643\u064a\u0644\u0648\u0628\u0627\u064a\u062a CSS \u0645\u0636\u063a\u0648\u0637\u0629 \u0639\u0628\u0631 \u0623\u0643\u062b\u0631 \u0645\u0646 2,000 \u0648\u062d\u062f\u0629\u060c \u0648\u0628\u0646\u0627\u0621 \u0625\u0646\u062a\u0627\u062c\u064a \u0641\u064a \u0633\u062a \u062b\u0648\u0627\u0646\u064d \u0645\u0642\u0627\u0628\u0644 \u062e\u0637\u0651 \u0623\u0633\u0627\u0633 \u0645\u0633\u062c\u0651\u0644\u060c \u0648\u062e\u0627\u062f\u0645 \u0628\u0644\u0627 \u0633\u064a\u0631\u0641\u0631 \u0648\u0644\u0627 \u0643\u0644\u0641\u0629 \u0645\u062a\u0643\u0631\u0651\u0631\u0629.",
      ],
    },
    {
      kind: "entry",
      title: "NL \u2014 \u0645\u0646\u0635\u0651\u0629 \u0645\u0648\u0633\u064a\u0642\u0649 \u0648\u0648\u0633\u0627\u0626\u0637",
      meta: "2025 \u2013 2026 \u00b7 \u0645\u0646\u062a\u062c \u062e\u0627\u0635\u0651 \u00b7 \u062a\u0635\u0645\u064a\u0645 \u0648\u0647\u0646\u062f\u0633\u0629 \u0648\u0625\u0635\u062f\u0627\u0631 \u00b7 noureddinelmobaraki-web.github.io/NL",
      items: [
        "\u0645\u062d\u0631\u0651\u0643 \u062a\u0634\u063a\u064a\u0644 \u0639\u0644\u0649 Web Audio \u0628\u062a\u0645\u0627\u0632\u062c \u0639\u0628\u0631 \u0639\u0642\u062f \u0627\u0644\u0643\u0633\u0628\u060c \u0648\u062a\u062d\u0645\u064a\u0644 \u0645\u0633\u0628\u0642\u060c \u0648\u0622\u0644\u0629 \u062d\u0627\u0644\u0627\u062a \u062a\u0635\u0645\u062f \u0623\u0645\u0627\u0645 \u0627\u0644\u062a\u0646\u0642\u0651\u0644 \u0627\u0644\u0633\u0631\u064a\u0639 \u0648\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u0642\u0627\u0637\u0639 \u062f\u0648\u0646 \u062a\u0642\u0637\u064a\u0639 \u0648\u0644\u0627 \u0639\u0642\u062f \u0645\u0647\u062c\u0648\u0631\u0629.",
        "\u0643\u0644\u0645\u0627\u062a LRC \u0645\u0648\u0642\u0651\u062a\u0629 \u062a\u064f\u062f\u0627\u0631 \u0645\u0646 requestAnimationFrame \u0644\u0627 \u0645\u0646 \u0645\u0624\u0642\u0651\u062a\u0627\u062a \u062f\u0648\u0631\u064a\u0629\u060c \u0641\u0644\u0627 \u064a\u0645\u0643\u0646 \u0644\u0644\u0625\u0628\u0631\u0627\u0632 \u0623\u0646 \u064a\u0646\u0632\u0627\u062d \u0639\u0646 \u0627\u0644\u0645\u0648\u062c\u0629\u061b \u0648\u0633\u062a\u0651\u0629 \u0633\u0645\u0627\u062a \u0643\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0645\u062a\u063a\u064a\u0651\u0631\u0627\u062a CSS \u062a\u062a\u0628\u062f\u0651\u0644 \u0628\u0635\u0646\u0641 \u0648\u0627\u062d\u062f \u0648\u0628\u0644\u0627 \u0625\u0639\u0627\u062f\u0629 \u0631\u0633\u0645 \u0644\u0644\u0645\u0643\u0648\u0651\u0646\u0627\u062a.",
        "63,786 \u0633\u0637\u0631\u064b\u0627 \u0648189 \u0645\u0643\u0648\u0651\u0646\u064b\u0627 \u0648142 \u062e\u0637\u0651\u0627\u0641\u064b\u0627\u060c \u0648227 \u0627\u062e\u062a\u0628\u0627\u0631\u064b\u0627 \u0641\u064a 46 \u0645\u0644\u0641\u064b\u0627\u060c \u06487 \u062e\u0637\u0648\u0637 \u062a\u0643\u0627\u0645\u0644 \u0645\u0633\u062a\u0645\u0631\u0651\u060c \u0648\u062e\u062f\u0645\u0629 Express 5 \u0625\u0644\u0649 \u062c\u0627\u0646\u0628 \u0627\u0644\u0648\u0627\u062c\u0647\u0629 \u0627\u0644\u0633\u0627\u0643\u0646\u0629.",
      ],
    },
    { kind: "section", title: "\u0627\u0644\u062a\u0639\u0644\u064a\u0645" },
    {
      kind: "lead",
      text: "\u062a\u0639\u0644\u0651\u0645 \u0630\u0627\u062a\u064a \u0644\u0647\u0646\u062f\u0633\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0627\u062a \u0627\u0644\u0623\u0645\u0627\u0645\u064a\u0629 \u0645\u0646 2021 \u0625\u0644\u0649 \u0627\u0644\u0622\u0646. \u0627\u0644\u062a\u0639\u0644\u0651\u0645 \u062c\u0627\u0621 \u0645\u0646 \u0625\u0635\u062f\u0627\u0631 \u0628\u0631\u0645\u062c\u064a\u0627\u062a \u0641\u064a \u0627\u0644\u0625\u0646\u062a\u0627\u062c \u062b\u0645\u0651 \u0635\u064a\u0627\u0646\u062a\u0647\u0627: \u0627\u0644\u0623\u062f\u0627\u0621\u060c \u0648\u0625\u0645\u0643\u0627\u0646\u064a\u0629 \u0627\u0644\u0648\u0635\u0648\u0644\u060c \u0648\u062a\u0639\u062f\u0651\u062f \u0627\u0644\u0644\u063a\u0627\u062a\u060c \u0648\u0627\u0644\u062a\u0643\u0627\u0645\u0644 \u0627\u0644\u0645\u0633\u062a\u0645\u0631\u0651\u060c \u0643\u0644\u0651\u0647\u0627 \u062a\u0639\u0644\u0651\u0645\u062a\u0647\u0627 \u0639\u0644\u0649 \u0645\u0646\u062a\u062c\u0627\u062a \u064a\u0639\u062a\u0645\u062f \u0639\u0644\u064a\u0647\u0627 \u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646 \u062d\u0642\u064a\u0642\u064a\u0648\u0646.",
    },
    { kind: "section", title: "\u0627\u0644\u0644\u063a\u0627\u062a" },
    {
      kind: "lead",
      text: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629 (\u0644\u063a\u0629 \u0623\u0645\u0651) \u00b7 \u0627\u0644\u0623\u0645\u0627\u0632\u064a\u063a\u064a\u0629 (\u0644\u063a\u0629 \u0623\u0645\u0651) \u00b7 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 (\u0645\u0633\u062a\u0648\u0649 \u0645\u0647\u0646\u064a) \u00b7 \u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629 (\u0645\u062d\u0627\u062f\u062b\u0629)",
    },
    { kind: "section", title: "\u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629" },
    {
      kind: "lead",
      text: "\u0645\u0646\u0641\u062a\u062d \u0639\u0644\u0649 \u0648\u0638\u064a\u0641\u0629 \u0628\u062f\u0648\u0627\u0645 \u0643\u0627\u0645\u0644 \u062f\u0627\u062e\u0644 \u0641\u0631\u064a\u0642\u060c \u0648\u0639\u0644\u0649 \u0639\u0642\u0648\u062f \u0648\u0645\u0647\u0627\u0645\u0651 \u0645\u0633\u062a\u0642\u0644\u0651\u0629. \u0645\u0642\u064a\u0645 \u0641\u064a \u0627\u0644\u062f\u0627\u0631 \u0627\u0644\u0628\u064a\u0636\u0627\u0621 \u0648\u0645\u0631\u062a\u0627\u062d \u0644\u0644\u0639\u0645\u0644 \u0639\u0646 \u0628\u0639\u062f.",
    },
  ],
};

export const CV_DOC: Record<Locale, CvPaperDoc> = { en, fr, ar };
