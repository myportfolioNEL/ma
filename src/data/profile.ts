import type { Channel, Fact, Language, NavItem, Profile } from "../types";

const portraitRemote = "https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Mee.webp";

/**
 * profile.ts — identity, copy and contact channels.
 * Every string the visitor reads about the person lives here.
 * Components never hardcode copy.
 */

const facts: Fact[] = [
  { key: "Based in", value: "Casablanca, remote-friendly" },
  { key: "Building since", value: "2021" },
  { key: "Focus", value: "Front-end & interface engineering" },
  { key: "Core stack", value: "React · TypeScript · Vite · Node" },
  { key: "How I work", value: "Branches, reviews, CI gates" },
  { key: "Open to", value: "Team roles, contract, freelance" },
];

const languages: Language[] = [
  { name: "Arabic", level: "Native" },
  { name: "Tamazight", level: "Native" },
  { name: "English", level: "Professional" },
  { name: "French", level: "Conversational" },
];

const channels: Channel[] = [
  {
    id: "github",
    label: "GitHub",
    value: "noureddinelmobaraki-web",
    href: "https://github.com/noureddinelmobaraki-web",
    kind: "code",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    value: "+212 612-806932",
    href: "https://wa.me/212612806932",
    kind: "phone",
  },
  {
    id: "telegram",
    label: "Telegram",
    value: "@noureddin_el_mobaraki",
    href: "https://t.me/noureddin_el_mobaraki",
    kind: "social",
  },
  {
    id: "instagram",
    label: "Instagram",
    value: "@nordine_el_mobaraki",
    href: "https://www.instagram.com/nordine_el_mobaraki/",
    kind: "social",
  },
];

export const profile: Profile = {
  name: "Noureddine El Mobaraki",
  firstName: "Noureddine",
  lastName: "El Mobaraki",
  initials: "NE",
  role: "Front-end engineer",
  roleLong: "Front-end engineer · Casablanca",
  location: "Casablanca, MA",
  timeZone: "Africa/Casablanca",
  status: "Available for work",
  email: "noureddinelmobaraki@gmail.com",
  phoneDisplay: "+212 612-806932",
  /* The local WebP was removed because it became corrupted in the repository
     after being written as text instead of binary. Keep the image outside the
     bundle and load the known-good hosted copy directly. */
  portraitUrl: portraitRemote,
  portraitSources: [portraitRemote],
  /* النسبة التي يُحجَز بها المكان قبل وصول الملف. الإطار يقصّ إلى هذه
     النسبة مهما كانت أبعاد الملف الأصلية، فلا يقفز التخطيط ولا تُشوَّه
     الصورة إن استُبدلت لاحقاً بأخرى. */
  portraitRatio: "4 / 5",
  /* موضع القصّ رأسياً. الوجوه تجلس في الثلث الأعلى، لا في المنتصف. */
  portraitFocus: "50% 24%",
  siteUrl: "https://myportfolionel.github.io/ma/",

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

  facts,
  languages,
  channels,
};

export const navItems: NavItem[] = [
  { id: "work", label: "Work", short: "Work" },
  { id: "numbers", label: "Numbers", short: "Numbers" },
  { id: "about", label: "About", short: "About" },
  { id: "capabilities", label: "Capabilities", short: "Skills" },
  { id: "contact", label: "Contact", short: "Contact" },
];

/**
 * Rendered in the hero marquee. This is the ONLY tools list on the site —
 * the capabilities section names the same tools with evidence attached, so a
 * second ticker would just repeat it.
 */
export const marqueeItems: string[] = [
  "React 19",
  "TypeScript",
  "Vite",
  "GSAP",
  "WebGL",
  "Web Audio API",
  "Node",
  "Playwright",
  "GitHub Actions",
  "i18n + RTL",
];
