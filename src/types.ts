/**
 * types.ts — every shape used by the data layer lives here and nowhere else.
 * Components import types from this file; they never redeclare them locally.
 */

export type NavItem = {
  id: string;
  label: string;
  /** Short label for the mobile tab bar, where 11 characters is the ceiling. */
  short: string;
};

export type Fact = {
  key: string;
  value: string;
};

export type Language = {
  name: string;
  level: string;
};

export type Channel = {
  id: string;
  label: string;
  value: string;
  href: string;
  kind: "mail" | "phone" | "social" | "code";
};

export type Profile = {
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
  roleLong: string;
  location: string;
  timeZone: string;
  status: string;
  email: string;
  phoneDisplay: string;
  portraitUrl: string;
  portraitSources?: readonly string[];
  portraitRatio: string;
  portraitFocus: string;
  heroLead: string;
  aboutLead: string;
  about: string[];
  contactTitle: string;
  contactLead: string;
  facts: Fact[];
  languages: Language[];
  channels: Channel[];
  siteUrl: string;
};

export type Project = {
  /** Stable key. Used for React keys, anchors and analytics. */
  id: string;
  /** Two-digit display index, e.g. "01". */
  index: string;
  name: string;
  kind: string;
  subtitle: string;
  year: string;
  /** Who the work was for. Shown in the case-study fact grid. */
  context: string;
  /** What I was responsible for. Never "sole everything". */
  role: string;
  /**
   * How the work was run with other people, or the process that makes it
   * pickup-ready for other people. One honest sentence, no invented clients.
   */
  collaboration: string;
  timeline: string;
  scale: string;
  overview: string;
  challenge: string;
  /** What was actually engineered. Rendered as a numbered list. */
  build: string[];
  /** Verifiable results only. No adjectives. */
  outcome: string[];
  /**
   * The page the live preview loads. Defaults to liveUrl. Set it when the
   * landing screen you want is behind a route, for example a hash route, and
   * the site's root would show something else.
   */
  previewUrl?: string;
  stack: string[];
  /**
   * The real screenshot of the running product, in full colour. It appears
   * only inside the opened case study — never inside the closed window.
   */
  imageUrl: string;
  /**
   * The window art. Shown inside the closed window or card, desaturated and
   * washed in that project's own colour. If the URL fails to load the
   * component falls back to imageUrl, so a wrong path costs a tint and never
   * a hole in the layout.
   */
  posterUrl: string;
  /**
   * How the window/card art is fitted.
   * "cover" fills the pane and crops — right for wide, abstract art.
   * "contain" shows the whole image, centred, never cropped — right when the
   * poster is itself a screenshot and cropping it would cut off the interface.
   * Defaults to "cover" when absent.
   */
  posterFit?: "cover" | "contain";
  imageAlt: string;
  liveUrl: string;
  repoUrl?: string;
};

export type Metric = {
  value: number;
  suffix?: string;
  label: string;
};

export type Capability = {
  index: string;
  title: string;
  items: Array<{ name: string; proof: string }>;
};

export type RevealKind = "up" | "fade" | "blur" | "clip";
