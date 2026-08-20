import type { Capability, Fact, Language, Metric, NavItem } from "../types";

export type Locale = "en" | "fr" | "ar";

export type ProjectTranslation = {
  kind: string;
  subtitle: string;
  context: string;
  role: string;
  collaboration: string;
  timeline: string;
  scale: string;
  overview: string;
  challenge: string;
  build: string[];
  outcome: string[];
  imageAlt: string;
};

export type TranslationBundle = {
  locale: Locale;
  dir: "ltr" | "rtl";
  navItems: NavItem[];
  profile: {
    role: string;
    roleLong: string;
    status: string;
    heroLead: string;
    aboutLead: string;
    about: string[];
    contactTitle: string;
    contactLead: string;
    facts: Fact[];
    languages: Language[];
  };
  sectionHeads: {
    work: { title: string; note: string };
    numbers: { title: string; note: string };
    about: { title: string; note: string };
    capabilities: { title: string; note: string };
    contact: { title: string; note: string };
  };
  metrics: Metric[];
  capabilities: Capability[];
  projects: Record<string, ProjectTranslation>;
  ui: {
    ctaWork: string;
    ctaContact: string;
    openCase: string;
    openLive: string;
    sourceCode: string;
    close: string;
    backToTop: string;
    loadingScreenshot: string;
    openInMailApp: string;
    mailPlateRest: string;
    mailPlateHover: string;
    mailPlateCopied: string;
    mailPlateFailed: string;
    mailPlateWriteToMe: string;
    mailPlateTapToCopy: string;
    mailPlateCopiedShort: string;
    mailPlateBlockedShort: string;
    mailAnnounceCopied: string;
    mailAnnounceFailed: string;
    whatsPlateLabel: string;
    whatsPlateHint: string;
    whatsPlatePrefill: string;
    whatsAriaLabel: string;
    cvDownload: string;
    cvHint: string;
    cvAriaLabel: string;
    cvAriaAr: string;
    cvAriaEn: string;
    cvAriaFr: string;
    cvStatusBusy: string;
    cvStatusDone: string;
    cvStatusSuspect: string;
    cvStatusFailed: string;
    cvSizeUnit: string;
    factTimeline: string;
    factRole: string;
    factContext: string;
    factScale: string;
    sectionProblem: string;
    sectionBuild: string;
    sectionCollab: string;
    sectionOutcome: string;
    sectionStack: string;
  };
};

export const translations: Record<Locale, TranslationBundle> = {
  en: {
    locale: "en",
    dir: "ltr",
    navItems: [
      { id: "work", label: "Work", short: "Work" },
      { id: "numbers", label: "Numbers", short: "Numbers" },
      { id: "about", label: "About", short: "About" },
      { id: "capabilities", label: "Capabilities", short: "Skills" },
      { id: "contact", label: "Contact", short: "Contact" },
    ],
    profile: {
      role: "Front-end engineer",
      roleLong: "Front-end engineer · Casablanca",
      status: "Available for work",
      heroLead:
        "I build web products end to end: interface, motion, state, tests, release. Three of them are live. I shipped those on my own, and I work the same way inside a team.",
      aboutLead:
        "Self-taught since 2021. I learned by shipping, then by fixing what did not survive real users.",
      about: [
        "I'm a front-end engineer in Casablanca. Most of what I know came from building three products and then keeping them alive: a music and media platform, a configurable art store, and a watch boutique.",
        "Working without a team taught me to work like one. Feature branches, pull requests, review before merge, CI that refuses a red build, and a short written note for every decision I would otherwise forget in a month. The point is not ceremony. It is that someone else can open the repository and be productive the same day — and that I can do the same in theirs.",
        "I'm comfortable on the other side of a handoff too. Reading a Figma file properly instead of guessing, picking up a codebase I didn't write, taking a review comment without defending the diff. Scope moves, deadlines move, and the honest answer is usually a smaller version shipped this week.",
        "Design isn't a separate department to me. Type, spacing, colour and motion are engineering decisions and I make them beside the code that implements them. When there is a designer in the room, that just means I have someone better than me to argue with.",
      ],
      contactTitle: "Tell me what\nyou're building",
      contactLead:
        "Full-time roles, contract work, or a project that needs a second pair of hands. Email is fastest and I answer every message. WhatsApp works too if you prefer to talk.",
      facts: [
        { key: "Based in", value: "Casablanca, remote-friendly" },
        { key: "Building since", value: "2021" },
        { key: "Focus", value: "Front-end & interface engineering" },
        { key: "Core stack", value: "React · TypeScript · Vite · Node" },
        { key: "How I work", value: "Branches, reviews, CI gates" },
        { key: "Open to", value: "Team roles, contract, freelance" },
      ],
      languages: [
        { name: "Arabic", level: "Native" },
        { name: "Tamazight", level: "Native" },
        { name: "English", level: "Professional" },
        { name: "French", level: "Conversational" },
      ],
    },
    sectionHeads: {
      work: {
        title: "Selected work",
        note: "Three products, shipped and public",
      },
      numbers: {
        title: "By the numbers",
        note: "Counted from the NL, PRISM and MOMENTO repositories in August 2026.",
      },
      about: {
        title: "About",
        note: "Self-taught since 2021",
      },
      capabilities: {
        title: "Capabilities",
        note: "Every item backed by shipped work",
      },
      contact: {
        title: "Contact",
        note: "Casablanca · Remote friendly",
      },
    },
    metrics: [
      { value: 101416, label: "Lines of production code across three products" },
      { value: 256, label: "React components in production" },
      { value: 302, label: "Automated tests, run on every commit" },
      { value: 15, label: "CI pipelines: quality, e2e, security, deploy" },
    ],
    capabilities: [
      {
        index: "A",
        title: "Engineering",
        items: [
          { name: "React 19 + TypeScript", proof: "256 components" },
          { name: "State architecture", proof: "Zustand · context" },
          { name: "Vite build pipelines", proof: "3 products" },
          { name: "Vitest + Playwright", proof: "302 tests" },
          { name: "CI/CD, reviews, CodeQL", proof: "15 pipelines" },
        ],
      },
      {
        index: "B",
        title: "Interface & motion",
        items: [
          { name: "Design systems in CSS", proof: "token-driven" },
          { name: "GSAP + ScrollTrigger", proof: "this site" },
          { name: "WebGL / GLSL", proof: "this site" },
          { name: "Accessibility", proof: "WCAG 2.1 AA" },
          { name: "Performance budgets", proof: "Lighthouse CI" },
        ],
      },
      {
        index: "C",
        title: "Product & language",
        items: [
          { name: "Writing decisions down", proof: "decision records" },
          { name: "i18n + RTL", proof: "AR · FR · EN" },
          { name: "Web Audio engines", proof: "NL" },
          { name: "Image pipelines", proof: "WebP · LQIP" },
          { name: "Music production", proof: "released as NL" },
        ],
      },
    ],
    projects: {
      nl: {
        kind: "Music & media platform",
        subtitle:
          "A six-theme media platform: audio engine, frame-locked lyrics, film library, retro desktop, accounts — in three languages.",
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
        imageAlt: "The NL media platform home screen with theme selector",
      },
      prism: {
        kind: "Configurable art commerce",
        subtitle:
          "A digital-art gallery and store with a live configurator, a spatial wall visualiser, and a back end that costs nothing to run.",
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
        imageAlt: "The PRISM gallery with a piece previewed on an interior wall",
      },
      momento: {
        kind: "Luxury retail boutique",
        subtitle:
          "A trilingual watch boutique built mobile-first, with a single-source price catalogue and WhatsApp checkout for the Moroccan market.",
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
        imageAlt: "The MOMENTO watch boutique collection screen",
      },
    },
    ui: {
      ctaWork: "See selected work",
      ctaContact: "Write to me",
      openCase: "Open case study",
      openLive: "Open the live site",
      sourceCode: "Source code",
      close: "Close",
      backToTop: "Back to top",
      loadingScreenshot: "Loading the screenshot",
      openInMailApp: "Open your mail app instead",
      mailPlateRest: "Hover to reveal the address",
      mailPlateHover: "Click to copy",
      mailPlateCopied: "Address copied",
      mailPlateFailed: "Copy blocked by the browser. Select and copy it by hand.",
      mailPlateWriteToMe: "Write to me",
      mailPlateTapToCopy: "Tap to copy",
      mailPlateCopiedShort: "Copied",
      mailPlateBlockedShort: "Copy blocked",
      mailAnnounceCopied: "Email address copied to the clipboard.",
      mailAnnounceFailed: "The browser blocked the copy. The address is visible on the button.",
      whatsPlateLabel: "Chat on WhatsApp",
      whatsPlateHint: "Opens WhatsApp",
      whatsPlatePrefill:
        "Hello Noureddine, I found your portfolio and I would like to talk about a front-end role or project.",
      whatsAriaLabel: "Open a WhatsApp conversation with Noureddine El Mobaraki",
      cvDownload: "Download CV (PDF)",
      cvHint: "One page - PDF - August 2026",
      cvAriaLabel: "Download the CV as a one-page PDF",
      cvAriaAr: "Download the CV in Arabic (PDF)",
      cvAriaEn: "Download the CV in English (PDF)",
      cvAriaFr: "Download the CV in French (PDF)",
      cvStatusBusy: "Preparing the file",
      cvStatusDone: "File saved",
      cvStatusSuspect: "Saved, but this copy is not the expected size",
      cvStatusFailed: "Download failed - handing over to the browser",
      cvSizeUnit: "KB",
      factTimeline: "Timeline",
      factRole: "Role",
      factContext: "Context",
      factScale: "Scale",
      sectionProblem: "The problem",
      sectionBuild: "How it was built",
      sectionCollab: "Working with others",
      sectionOutcome: "Outcome",
      sectionStack: "Stack",
    },
  },
  fr: {
    locale: "fr",
    dir: "ltr",
    navItems: [
      { id: "work", label: "Projets", short: "Projets" },
      { id: "numbers", label: "Chiffres", short: "Chiffres" },
      { id: "about", label: "À propos", short: "Profil" },
      { id: "capabilities", label: "Compétences", short: "Skills" },
      { id: "contact", label: "Contact", short: "Contact" },
    ],
    profile: {
      role: "Ingénieur Front-End",
      roleLong: "Ingénieur Front-End · Casablanca",
      status: "Disponible pour de nouveaux projets",
      heroLead:
        "Je conçois des produits web de bout en bout : interface, animations, architecture d'état, tests et déploiement. Trois produits sont en production. Conçus en autonomie, avec la même rigueur qu'en équipe.",
      aboutLead:
        "Autodidacte depuis 2021. J'ai appris en déployant, puis en consolidant ce qui résistait aux vrais utilisateurs.",
      about: [
        "Je suis ingénieur front-end basé à Casablanca. L'essentiel de mon savoir-faire provient de la création et du maintien de trois produits complets : une plateforme multimédia & audio, une boutique d'art configurable, et une boutique horlogère de luxe.",
        "Travailler en autonomie m'a appris la discipline d'équipe : branches de fonctionnalités, pull requests, revues systématiques avant fusion, intégration continue stricte et documentation claire de chaque décision d'architecture.",
        "Je maîtrise parfaitement le travail collaboratif et l'intégration : lecture rigoureuse de maquettes Figma, reprise de code existant et accueil constructif des retours de revue.",
        "Le design fait partie intégrante de mon ingénierie : typographie, espacements, couleurs et animations sont des choix techniques pensés directement avec le code.",
      ],
      contactTitle: "Parlons de votre\nprochain projet",
      contactLead:
        "Postes à temps plein, missions freelance ou renfort technique. Le courrier électronique reste le canal le plus direct. WhatsApp est également disponible.",
      facts: [
        { key: "Localisation", value: "Casablanca, ouvert au télétravail" },
        { key: "Développement", value: "Depuis 2021" },
        { key: "Spécialité", value: "Ingénierie Front-End & Interfaces" },
        { key: "Stack clé", value: "React · TypeScript · Vite · Node" },
        { key: "Méthode", value: "Branches, PRs, revues, CI/CD" },
        { key: "Disponibilité", value: "CDI, Contrat, Freelance" },
      ],
      languages: [
        { name: "Arabe", level: "Langue maternelle" },
        { name: "Amazighe", level: "Langue maternelle" },
        { name: "Anglais", level: "Professionnel" },
        { name: "Français", level: "Courant" },
      ],
    },
    sectionHeads: {
      work: {
        title: "Projets sélectionnés",
        note: "Trois produits déployés et accessibles en ligne",
      },
      numbers: {
        title: "En chiffres",
        note: "Relevé des dépôts NL, PRISM et MOMENTO en août 2026.",
      },
      about: {
        title: "À propos",
        note: "Autodidacte depuis 2021",
      },
      capabilities: {
        title: "Compétences",
        note: "Chaque compétence prouvée par du code en production",
      },
      contact: {
        title: "Contact",
        note: "Casablanca · Télétravail bienvenu",
      },
    },
    metrics: [
      { value: 101416, label: "Lignes de code en production sur 3 projets" },
      { value: 256, label: "Composants React en production" },
      { value: 302, label: "Tests automatisés exécutés à chaque commit" },
      { value: 15, label: "Pipelines CI : qualité, e2e, sécurité, déploiement" },
    ],
    capabilities: [
      {
        index: "A",
        title: "Ingénierie",
        items: [
          { name: "React 19 + TypeScript", proof: "256 composants" },
          { name: "Architecture d'état", proof: "Zustand · context" },
          { name: "Pipelines Vite", proof: "3 produits" },
          { name: "Vitest + Playwright", proof: "302 tests" },
          { name: "CI/CD, revues, CodeQL", proof: "15 pipelines" },
        ],
      },
      {
        index: "B",
        title: "Interface & Animation",
        items: [
          { name: "Design systems en CSS", proof: "Tokens CSS" },
          { name: "GSAP + ScrollTrigger", proof: "Ce portfolio" },
          { name: "WebGL / GLSL", proof: "Ce portfolio" },
          { name: "Accessibilité", proof: "WCAG 2.1 AA" },
          { name: "Budgets de performance", proof: "Lighthouse CI" },
        ],
      },
      {
        index: "C",
        title: "Produit & Internationalisation",
        items: [
          { name: "Documentation technique", proof: "Decision records" },
          { name: "i18n + RTL", proof: "AR · FR · EN" },
          { name: "Moteurs Web Audio", proof: "NL" },
          { name: "Optimisation d'images", proof: "WebP · LQIP" },
          { name: "Production musicale", proof: "Projet NL" },
        ],
      },
    ],
    projects: {
      nl: {
        kind: "Plateforme musicale & média",
        subtitle:
          "Une plateforme multimédia à 6 thèmes : moteur audio, paroles synchronisées, cinémathèque, bureau rétro et comptes — en 3 langues.",
        context: "Projet personnel, en ligne depuis 2025",
        role: "Design, ingénierie et déploiement",
        collaboration:
          "Géré comme un dépôt d'équipe : branches de fonctionnalités, pull requests et 227 tests validant chaque merge avec notes de version détaillées.",
        timeline: "18 mois, maintenance active",
        scale: "63 786 lignes · 189 composants · 142 hooks",
        overview:
          "NL est la plateforme de mon projet musical. Née d'une page unique, elle est devenue un écosystème : moteur Web Audio, paroles synchronisées à l'onde sonore, cinémathèque, univers cassette rétro, bureau style Windows XP, et 6 thèmes dynamiques.",
        challenge:
          "Les applications multimédias ne pardonnent aucun ralentissement. Garantir une synchronisation parfaite audio/paroles et une mise en page RTL impeccable sans dépendances lourdes nécessitait une architecture interne sur mesure.",
        build: [
          "Moteur Web Audio avec fondu enchaîné sur nœuds de gain et gestion d'état robuste contre les coupures.",
          "Moteur de paroles LRC avec synchronisation via requestAnimationFrame sans décalage temporel.",
          "Support trilingue complet (arabe, anglais, français) avec basculement dynamique et miroir RTL parfait.",
          "6 thèmes gérés en pures propriétés CSS sans re-render.",
          "Catalogue de films et vidéos avec recherche rapide, filtres et skeletons anti-décalage de layout.",
          "Backend Express 5 pour les services dynamiques en complément de l'hébergement statique.",
          "7 pipelines GitHub Actions pour les tests, l'analyse de sécurité CodeQL et le déploiement continu.",
        ],
        outcome: [
          "227 tests automatisés couvrant 46 fichiers à chaque commit.",
          "3 langues supportées avec disposition RTL sans régression visuelle.",
          "Synchronisation audio parfaite même en navigation d'onglets en arrière-plan.",
          "18 mois de fonctionnalités régulières sans refonte globale.",
        ],
        imageAlt: "Écran d'accueil de la plateforme NL avec sélecteur de thème",
      },
      prism: {
        kind: "E-commerce d'art configurable",
        subtitle:
          "Galerie d'art numérique et boutique avec configurateur en temps réel, visualiseur mural et backend sans coût d'infrastructure.",
        context: "Produit personnel conçu pour de vraies commandes",
        role: "Design et ingénierie",
        collaboration:
          "Modèle tarifaire et choix d'architecture documentés sous forme de decision records pour une reprise immédiate.",
        timeline: "5 mois",
        scale: "28 821 lignes · 46 composants · 8 sections code-split",
        overview:
          "PRISM propose des œuvres d'art numérique sur toiles physiques. Visualisation sur mur réel, configuration des dimensions et finitions avec calcul de prix immédiat, et commande automatisée via Google Apps Script (Drive et Sheets).",
        challenge:
          "La tarification configurable exige une précision absolue. Chaque format et finition multiplie les combinaisons sans marge d'erreur entre le devis et la facture, tout en gérant les fichiers volumineux des utilisateurs.",
        build: [
          "Module de calcul tarifaire unique et immuable garantissant la cohérence des prix.",
          "Configurateur interactif réactif recalculant le prix sans appel serveur inutile.",
          "Visualiseur spatial intégrant l'œuvre dans des pièces témoins à l'échelle exacte.",
          "Pipeline de compression d'images côté client avec reprise sur erreur.",
          "Backend Google Apps Script sécurisé vers Google Drive et Google Sheets.",
          "Catalogue compilé en statique éliminant les temps de chargement réseau.",
          "8 sections chargées en React.lazy avec suivi strict des performances.",
        ],
        outcome: [
          "Bundle ultra-léger de 281 ko JS et 22 ko CSS gzippés sur plus de 2000 modules.",
          "Builds de production en 6 secondes mesurés avec rigueur.",
          "Zéro divergence de prix entre la prévisualisation et la commande.",
          "Zéro coût d'infrastructure serveur récurrent.",
        ],
        imageAlt: "Galerie PRISM avec tableau mis en situation sur un mur",
      },
      momento: {
        kind: "Boutique d'horlogerie de luxe",
        subtitle:
          "Boutique horlogère trilingue conçue mobile-first, avec catalogue de prix unique et commande via WhatsApp pour le marché marocain.",
        context: "Conçu pour un détaillant horloger à Casablanca",
        role: "Design et ingénierie",
        collaboration:
          "Catalogue et contenus centralisés dans un fichier typé unique, modifiable sans toucher aux composants React.",
        timeline: "3 mois",
        scale: "8 809 lignes · 21 composants · 3 langues",
        overview:
          "MOMENTO est une vitrine de prestige pour un détaillant casablancais. Collections homme/femme, essayage virtuel, panier et validation de commande directe sur WhatsApp avec calcul des frais de livraison pour toutes les villes du Maroc.",
        challenge:
          "Maintenir une cohérence totale des prix en 3 langues sur mobile, dans un marché où l'acte d'achat se conclut par messagerie instantanée.",
        build: [
          "Source unique de données pour le catalogue, les prix et les déclinaisons.",
          "Architecture multilingue (arabe, français, anglais) avec inversion RTL et devises locales.",
          "Structure mobile-first fluide avec tiroirs interactifs (panier, favoris, filtres).",
          "Générateur de commande WhatsApp formatant le panier en message lisible.",
          "Calculateur tarifaire de livraison pour les principales villes marocaines.",
          "44 tests unitaires et tests de parcours Playwright automatisés.",
        ],
        outcome: [
          "3 langues en miroir RTL complet validées par des tests rigoureux.",
          "Zéro incohérence entre les fiches produits et le récapitulatif panier.",
          "Finalisation d'achat sur le canal préféré des clients locaux.",
          "44 tests unitaires et 4 pipelines CI sécurisant chaque mise en ligne.",
        ],
        imageAlt: "Écran des collections de la boutique de montres MOMENTO",
      },
    },
    ui: {
      ctaWork: "Voir les projets",
      ctaContact: "Me contacter",
      openCase: "Ouvrir l'étude de cas",
      openLive: "Ouvrir le site en direct",
      sourceCode: "Code source",
      close: "Fermer",
      backToTop: "Haut de page",
      loadingScreenshot: "Chargement de la capture",
      openInMailApp: "Ouvrir votre messagerie",
      mailPlateRest: "Survoler pour afficher l'adresse",
      mailPlateHover: "Cliquer pour copier",
      mailPlateCopied: "Adresse copiée !",
      mailPlateFailed: "Copie bloquée par le navigateur. Copiez à la main.",
      mailPlateWriteToMe: "Écrivez-moi",
      mailPlateTapToCopy: "Appuyez pour copier",
      mailPlateCopiedShort: "Copié",
      mailPlateBlockedShort: "Copie bloquée",
      mailAnnounceCopied: "Adresse email copiée dans le presse-papier.",
      mailAnnounceFailed: "Le navigateur a bloqué la copie.",
      whatsPlateLabel: "Discuter sur WhatsApp",
      whatsPlateHint: "Ouvre WhatsApp",
      whatsPlatePrefill:
        "Bonjour Noureddine, j'ai vu votre portfolio et je souhaite parler d'un poste ou d'un projet front-end.",
      whatsAriaLabel:
        "Ouvrir une conversation WhatsApp avec Noureddine El Mobaraki",
      cvDownload: "Télécharger le CV (PDF)",
      cvHint: "Une page - PDF - août 2026",
      cvAriaLabel: "Télécharger le CV en PDF, une page",
      cvAriaAr: "Télécharger le CV en arabe (PDF)",
      cvAriaEn: "Télécharger le CV en anglais (PDF)",
      cvAriaFr: "Télécharger le CV en français (PDF)",
      cvStatusBusy: "Préparation du fichier",
      cvStatusDone: "Fichier enregistré",
      cvStatusSuspect: "Enregistré, mais cette copie n'a pas la taille prévue",
      cvStatusFailed: "Échec du téléchargement - le navigateur prend le relais",
      cvSizeUnit: "Ko",
      factTimeline: "Durée",
      factRole: "Rôle",
      factContext: "Contexte",
      factScale: "Échelle",
      sectionProblem: "Le problème",
      sectionBuild: "Ingénierie & Réalisation",
      sectionCollab: "Collaboration & Méthode",
      sectionOutcome: "Résultats",
      sectionStack: "Technologies",
    },
  },
  ar: {
    locale: "ar",
    dir: "rtl",
    navItems: [
      { id: "work", label: "الأعمال", short: "الأعمال" },
      { id: "numbers", label: "الأرقام", short: "الأرقام" },
      { id: "about", label: "عنّي", short: "عنّي" },
      { id: "capabilities", label: "المهارات", short: "المهارات" },
      { id: "contact", label: "التواصل", short: "التواصل" },
    ],
    profile: {
      role: "مهندس واجهات أمامية",
      roleLong: "مهندس واجهات أمامية · الدار البيضاء",
      status: "متاح للعمل والمشاريع",
      heroLead:
        "أبني المنتجات الرقمية من البداية إلى الإطلاق: الواجهة، الحركة، إدارة الحالة، الاختبارات، والنشر المباشر. ثلاثة منتجات تعمل وتخدم مستخدميها اليوم. طورتها باستقلالية، وبالانضباط نفسه الذي أعمل به داخل فريق.",
      aboutLead:
        "عصامي في التعلم منذ عام 2021. تعلمت من خلال إطلاق المنتجات الحقيقية، ثم إصلاح ما لم يصمد أمام المستخدمين.",
      about: [
        "أنا مهندس واجهات أمامية أقيم في الدار البيضاء. اكتسبت معظم خبرتي من بناء ثلاثة منتجات رقمية متكاملة والحفاظ عليها: منصة وسائط وصوتيات، ومتجر فن رقمي تفاعلي، وبوتيك ساعات فاخرة.",
        "العمل المستقل علمني أسس العمل الجماعي المنضبط: تفريع الميزات (Feature Branches)، طلبات السحب (Pull Requests)، المراجعة قبل الدمج، وبوابات التكامل المستمر (CI) التي تمنع دمج أي كود غير سليم، مع توثيق قرارات التصميم والبرمجة.",
        "أتعامل بسلاسة مع تصاميم Figma وأترجمها بدقة إلى كود حي، وأتكيف مع المشاريع البرمجية القائمة بروح منفتحة على الملاحظات والتحسين.",
        "التصميم والهندسة عندي كلٌّ لا يتجزأ؛ الخط، والمسافات، واللون، والحركة قرارات هندسية تُصنع جنبًا إلى جنب مع الشيفرة البرمجية.",
      ],
      contactTitle: "أخبرني عما\nتريد بناءه",
      contactLead:
        "متاح للمشاريع الكاملة، العقود التعاقدية، أو الاستشارات البرمجية. البريد الإلكتروني هو الأسرع للإجابة، ورسائل واتساب متاحة أيضًا.",
      facts: [
        { key: "المقر", value: "الدار البيضاء · متاح للعمل عن بُعد" },
        { key: "تاريخ البدء", value: "منذ 2021" },
        { key: "التخصص", value: "هندسة الواجهات وتجربة المستخدم" },
        { key: "التقنيات الأساسية", value: "React · TypeScript · Vite · Node" },
        { key: "أسلوب العمل", value: "الفروع، المراجعات، واختبارات CI" },
        { key: "نوع التعاقد", value: "دوام كامل، عقود، عمل حر" },
      ],
      languages: [
        { name: "العربية", level: "اللغة الأم" },
        { name: "الأمازيغية", level: "اللغة الأم" },
        { name: "الإنجليزية", level: "مستوى مهني متقدم" },
        { name: "الفرنسية", level: "محادثة بطلاقة" },
      ],
    },
    sectionHeads: {
      work: {
        title: "أعمال مختارة",
        note: "ثلاثة منتجات منشورة ومتاحة للعموم",
      },
      numbers: {
        title: "بالأرقام",
        note: "مأخوذة من مستودعات NL و PRISM و MOMENTO في أغسطس 2026.",
      },
      about: {
        title: "عنّي",
        note: "عصامي في التعلم منذ عام 2021",
      },
      capabilities: {
        title: "القدرات والمهارات",
        note: "كل مهارة مقرونة بما يثبتها من مشاريع منشورة",
      },
      contact: {
        title: "تواصل معي",
        note: "الدار البيضاء · متاح للعمل عن بُعد",
      },
    },
    metrics: [
      { value: 101416, label: "سطر كود برمجي قيد التشغيل في 3 مشاريع" },
      { value: 256, label: "مكوّن React مبني ويعمل في الإنتاج" },
      { value: 302, label: "اختبار تلقائي يعمل عند كل حفظ ودمج" },
      { value: 15, label: "مسارات تكامل مستمر: جودة، واجهات، وأمان" },
    ],
    capabilities: [
      {
        index: "أ",
        title: "الهندسة البرمجية",
        items: [
          { name: "React 19 + TypeScript", proof: "256 مكوّن" },
          { name: "معمارية الحالة", proof: "Zustand · Context" },
          { name: "بيئات بناء Vite", proof: "3 منتجات" },
          { name: "Vitest + Playwright", proof: "302 اختبار" },
          { name: "CI/CD ومراجعات CodeQL", proof: "15 مسار تدقيق" },
        ],
      },
      {
        index: "ب",
        title: "الواجهات والحركة",
        items: [
          { name: "أنظمة التصميم بلغة CSS", proof: "مبنية بالرموز (Tokens)" },
          { name: "GSAP + ScrollTrigger", proof: "هذا الموقع" },
          { name: "WebGL / GLSL", proof: "هذا الموقع" },
          { name: "إمكانية الوصول (A11y)", proof: "معيار WCAG 2.1 AA" },
          { name: "موازين الأداء والسرعة", proof: "Lighthouse CI" },
        ],
      },
      {
        index: "ج",
        title: "المنتج والتعريب",
        items: [
          { name: "توثيق القرارات البرمجية", proof: "سجلات هندسية" },
          { name: "التعريب ودعم RTL", proof: "عربي · فرنسي · إنجليزي" },
          { name: "محركات الصوتيات للويب", proof: "مشروع NL" },
          { name: "معالجة وضغط الصور", proof: "WebP · LQIP" },
          { name: "الإنتاج الموسيقي", proof: "منشور في NL" },
        ],
      },
    ],
    projects: {
      nl: {
        kind: "منصة موسيقى ووسائط متعددة",
        subtitle:
          "منصة وسائط متكاملة بستة سمات بصرية: محرك صوتي، كلمات متزامنة مع الموجة، مكتبة أفلام، وبيئة سطح مكتب تفاعلية بثلاث لغات.",
        context: "مشروعي الخاص، متاح للعامة منذ 2025",
        role: "التصميم، التطوير، والنشر",
        collaboration:
          "أُدير المشروع كفريق عمل كامل: فروع منفصلة للميزات، وفحوصات تكامل آلي لا تسمح بالدمج إلا باجتياز 227 اختباراً بنجاح مع توثيق التحديثات.",
        timeline: "18 شهراً من التطوير المستمر",
        scale: "63,786 سطر كود · 189 مكوّن · 142 خطاف (Hook)",
        overview:
          "NL هي المنصة الخاصة بمشروعي الموسيقي. بدأت كصفحة واحدة ونمت لتصبح منصة متكاملة: محرك تشغيل Web Audio، كلمات أغاني متزامنة بدقة، مكتبة أفلام وفيديو، بيئة راديو كاسيت كلاسيكية، سطح مكتب شبيه بـ Windows XP، وحسابات للمستخدمين مع ست سمات لونية مختلفة.",
        challenge:
          "تطبيقات الوسائط لا تحتمل الخطأ في تجربة المستخدم؛ تقطع الصوت، أو تأخر الكلمات، أو انهيار الواجهة عند تحويلها إلى اليمين (RTL) يفسد التجربة فوراً. الحل تطلب بناء معمارية مخصصة للصوت والتوقيت والتعريب دون الاعتماد على حلول جاهزة.",
        build: [
          "محرك صوتي Web Audio مع خاصية التلاشي المتداخل (Crossfading) وإدارة دقيقة للذاكرة دون تقطيع.",
          "محرك كلمات LRC يحلل التوقيت عبر requestAnimationFrame لمنع أي انزياح زمني في المزامنة.",
          "طبقة تعريب ثلاثية (عربية، إنجليزية، فرنسية) مع محاذاة RTL دقيقة ومحفوظة في المتصفح.",
          "ستة سمات بصرية مبنية بمتغيرات CSS الخالصة دون إعادة رسم المكونات.",
          "مكتبة وسائط وفيديو مع بحث فوري، تصنيفات، وهياكل تحميل تمنع القفزات البصرية في الصفحة.",
          "خدمة Express 5 مرافقة للواجهة الثابتة لمعالجة المتطلبات الديناميكية.",
          "7 مسارات أتمتة عبر GitHub Actions للفحص الشامل، الأمان، واختبارات الأداء.",
        ],
        outcome: [
          "227 اختباراً تلقائياً عبر 46 ملفاً تعمل عند كل عملية حفظ وتحديث.",
          "دعم ثلاث لغات مع محاذاة يمين كاملة دون أي تشوه بصري.",
          "ثبات التزامن الصوتي حتى مع التبديل السريع للمقاطع وتصفح علامات تبويب أخرى.",
          "18 شهراً من الإضافات المتواصلة على نفس المعمارية المتينة.",
        ],
        imageAlt: "الشاشة الرئيسية لمنصة NL مع منتقي السمات البصرية",
      },
      prism: {
        kind: "متجر فن رقمي تفاعلي وتجارة مخصصة",
        subtitle:
          "معرض ومتجر للفن الرقمي مع أداة ضبط مباشرة، ومحاكي لوحات ثلاثي الأبعاد على الجدران، مع بنية خلفية بدون تكاليف تشغيلية.",
        context: "منتج خاص مصمم لاستقبال وتجهيز طلبات حقيقية",
        role: "التصميم والهندسة البرمجية",
        collaboration:
          "نموذج التسعير والموازنات الهندسية موثقة في سجلات قرارات برمجية (Decision Records) تتيح لأي مطور الانضمام والمتابعة مباشرة.",
        timeline: "5 أشهر",
        scale: "28,821 سطر كود · 46 مكوّن · 8 أقسام مقسمة كودياً",
        overview:
          "يقدم PRISM الفن الرقمي كلوحات حائطية مطبوعة. يستعرض الزائر المعرض، ويعاين اللوحة داخل غرف مجهزة، ويحدد المقاس واللمسات النهائية لتحديث السعر لحظياً، مع إرسال الطلبات وصور المراجع بدقة عالية إلى نظام Google Apps Script المرتبط بـ Drive و Sheets.",
        challenge:
          "تطبيقات التجارة المخصصة تكون حساسة في منطق التسعير وتعدد الخيارات؛ وأي خطأ بسيط في الحساب يسبب فقدان العميل، بالإضافة إلى التعامل مع ملفات الصور الكبيرة دون إرهاق المتصفح.",
        build: [
          "وحدة تسعير نقية تمثل المصدر الوحيد لحساب الأبعاد وخيارات التأطير وتنسيق الأسعار محلياً.",
          "أداة تخصيص تفاعلية تعيد حساب السعر وتحديث اللوحة لحظياً دون طلبات خادم زائدة.",
          "محاكي فراغي يدمج العمل الفني داخل صور غرف حقيقية بالمقياس الطبيعي.",
          "مسار طلبات يتضمن ضغط الصور على جهاز المستخدم مع معالجة ذكية للأخطاء.",
          "بنية خلفية خفيفة وآمنة تستقبل الطلبات وتنظمها داخل Google Drive و Google Sheets.",
          "دليل أعمال فنية مولّد أثناء البناء يلغي شاشات الانتظار وبطء التحميل.",
          "8 أقسام محملة تقنياً عبر React.lazy مع رقابة دقيقة على سرعة التصفح.",
        ],
        outcome: [
          "حجم كود مضغوط لا يتعدى 281 كيلوبايت JS و 22 كيلوبايت CSS لأكثر من ألفي موديول.",
          "زمن بناء للمشروع في 6 ثوانٍ فقط قياساً على معايير الإنتاج.",
          "تطابق تام وموثوق بين سعر المعاينة وسعر الطلب النهائي.",
          "صفر تكاليف تشغيل شهرية للبنية الخلفية بفضل الحلول الخادمة الذاتية.",
        ],
        imageAlt: "معرض PRISM مع لوحة معروضة على جدار داخلي",
      },
      momento: {
        kind: "بوتيك ساعات فاخرة",
        subtitle:
          "بوتيك ساعات بثلاث لغات مصمم أولاً للهواتف، مع كتالوج أسعار موحد وطلب مباشر عبر واتساب مخصص للسوق المغربي.",
        context: "تم بناؤه لصالح متجر ساعات في الدار البيضاء",
        role: "التصميم والهندسة البرمجية",
        collaboration:
          "فُصلت المنتجات والأسعار والنصوص العربية في ملف موحد يمكن لصاحب المتجر تعديله دون فتح أي كود برمجي.",
        timeline: "3 أشهر",
        scale: "8,809 أسطر كود · 21 مكوّن · 3 لغات",
        overview:
          "MOMENTO هو واجهة لمتجر ساعات في الدار البيضاء. يتيح تصفح تشكيلات الرجال والنساء، وتجربة الساعات في عارض مخصص، وإتمام الطلب عبر WhatsApp — القناة المفضلة للعملاء محلياً — مع سلة مشتريات وحاسبة تسعير شحن لكل المدن المغربية.",
        challenge:
          "كتالوجات التجزئة تفقد مصداقيتها فور وجود سعرين مختلفين لنفس المنتج. كما كان لزاماً أن تعمل المنصة بطلاقة باللغات الثلاث على شاشات الهواتف.",
        build: [
          "ملف كتالوج موحد يمثل المصدر الوحيد للمنتجات والأسعار لضمان تطابق البيانات في كل شاشة.",
          "نظام دعم لغات ثلاثي (عربي، فرنسي، إنجليزي) مع تخطيط يمين معكوس وتنسيق عملات محلي.",
          "واجهة مرنة تركز على الهاتف مع أدراج سحب للسلة والمفضلة ونوافذ عرض للمنتجات.",
          "منشئ رسائل واتساب الذكي الذي يحول محتوى السلة إلى رسالة نصية منظمة وواضحة.",
          "حاسبة مدمجة لتعريفات الشحن تغطي مختلف المدن المغربية.",
          "44 اختباراً آلياً للأسعار ومسارات التصفح عبر Playwright.",
        ],
        outcome: [
          "ثلاث لغات مدعومة مع محاذاة عربية كاملة موثقة باختبارات تمنع فقدان أي نص.",
          "مصدر سعر واحد يستحيل معه حدوث أي اختلاف بين البطاقة والسلة.",
          "إتمام عمليات الشراء بسهولة عبر القناة المألوفة للمستخدمين.",
          "44 اختباراً و 4 مسارات تكامل تحمي كل تحديث للواجهة.",
        ],
        imageAlt: "شاشة التشكيلات لبوتيك الساعات MOMENTO",
      },
    },
    ui: {
      ctaWork: "مشاهدة الأعمال",
      ctaContact: "تواصل معي",
      openCase: "فتح دراسة الحالة",
      openLive: "فتح الموقع المباشر",
      sourceCode: "المصدر البرمجي",
      close: "إغلاق",
      backToTop: "العودة للأعلى",
      loadingScreenshot: "جاري تحميل الصورة",
      openInMailApp: "فتح تطبيق البريد مباشرة",
      mailPlateRest: "مرر المؤشر لإظهار البريد",
      mailPlateHover: "انقر للنسخ",
      mailPlateCopied: "تم نسخ البريد الإلكتروني",
      mailPlateFailed: "تعذر النسخ التلقائي. انسخ العنوان يدوياً.",
      mailPlateWriteToMe: "اكتب لي",
      mailPlateTapToCopy: "انقر لنسخ البريد",
      mailPlateCopiedShort: "تم النسخ",
      mailPlateBlockedShort: "تعذر النسخ",
      mailAnnounceCopied: "تم نسخ عنوان البريد الإلكتروني إلى الحافظة.",
      mailAnnounceFailed: "تعذر النسخ التلقائي. البريد معروض على الزر.",
      whatsPlateLabel: "محادثة على واتساب",
      whatsPlateHint: "يفتح واتساب مباشرة",
      whatsPlatePrefill:
        "السلام عليكم نور الدين، رأيت موقعك وأريد الحديث عن وظيفة أو مشروع في الواجهات الأمامية.",
      whatsAriaLabel: "فتح محادثة واتساب مع نور الدين المباركي",
      cvDownload: "تنزيل السيرة الذاتية (PDF)",
      cvHint: "صفحة واحدة · PDF · أغسطس 2026",
      cvAriaLabel: "تنزيل السيرة الذاتية بصيغة PDF من صفحة واحدة",
      cvAriaAr: "تنزيل السيرة الذاتية بالعربية (PDF)",
      cvAriaEn: "تنزيل السيرة الذاتية بالإنجليزية (PDF)",
      cvAriaFr: "تنزيل السيرة الذاتية بالفرنسية (PDF)",
      cvStatusBusy: "جارٍ تحضير الملف",
      cvStatusDone: "تمّ حفظ الملف",
      cvStatusSuspect: "حُفظ الملف، لكن حجم هذه النسخة غير متوقّع",
      cvStatusFailed: "تعذّر التنزيل - المتصفّح يتولّى الأمر",
      cvSizeUnit: "ك.ب",
      factTimeline: "المدة",
      factRole: "الدور",
      factContext: "السياق",
      factScale: "الحجم",
      sectionProblem: "التحدي البرمجي",
      sectionBuild: "كيف تم البناء",
      sectionCollab: "العمل والتعاون",
      sectionOutcome: "النتائج والأثر",
      sectionStack: "التقنيات المستخدمة",
    },
  },
};
