import { describe, expect, it } from "vitest";
import { CV_ORDER, cv, cvMirrorBase, cvVersion } from "./cv";
import { profile } from "./profile";
import { projects } from "./projects";
import { translations } from "./translations";

/**
 * Domains that must never appear in this repository's data layer.
 *
 * This is a professional engineering portfolio. Music and streaming profiles
 * belong to a different site, and a link that arrives "just this once" is how
 * that boundary gets lost. The test is the boundary now.
 */
const FORBIDDEN_DOMAINS = [
  "open.spotify.com",
  "music.apple.com",
  "deezer.com",
  "anghami.com",
  "qobuz.com",
  "soundcloud.com",
  "music.amazon",
  "linktr.ee",
];

const DATA_LAYER = JSON.stringify({ profile, projects, translations });

describe("data layer", () => {
  it("contains no music or streaming links", () => {
    for (const domain of FORBIDDEN_DOMAINS) {
      expect(DATA_LAYER, "forbidden domain " + domain).not.toContain(domain);
    }
  });

  it("uses only https, mailto or tel in contact channels", () => {
    expect(profile.channels.length).toBeGreaterThan(0);
    for (const channel of profile.channels) {
      expect(channel.href, channel.id).toMatch(/^(https:\/\/|mailto:|tel:)/);
    }
  });

  it("gives every project a unique id and an https live URL", () => {
    const seen = new Set<string>();
    for (const project of projects) {
      expect(seen.has(project.id), "duplicate id " + project.id).toBe(false);
      seen.add(project.id);
      expect(project.liveUrl, project.id).toMatch(/^https:\/\//);
      expect(project.imageUrl, project.id).toMatch(/^https:\/\//);
    }
  });

  /* The order is a decision, so it is a test. If someone reorders the literals
     in projects.ts by hand again, this fails before a reviewer has to notice
     that the window says 03 and sits first. */
  it("shows MOMENTO, then PRISM, then NL, with matching index labels", () => {
    expect(projects.map((project) => project.id)).toEqual([
      "momento",
      "prism",
      "nl",
    ]);
    expect(projects.map((project) => project.index)).toEqual([
      "01",
      "02",
      "03",
    ]);
  });

  it("serves one CV per locale, from two sources, versioned for the cache", () => {
    for (const locale of Object.keys(translations) as Array<
      keyof typeof translations
    >) {
      const file = cv[locale];

      expect(file.code, locale).toBe(locale.toUpperCase());
      expect(file.bytes, locale).toBeGreaterThan(12 * 1024);
      expect(file.fileName, locale).toMatch(/^Noureddine-El-Mobaraki-CV-/);
      expect(file.fileName, locale).toMatch(/\.pdf$/);

      /* Two copies, never one. A single source is a single point of failure,
         and this repository has already lost that bet once. */
      expect(
        file.sources.map((source) => source.kind),
        locale,
      ).toEqual(["local", "mirror"]);
      expect(file.sources[0].url, locale).toBe(
        `./cv/cv-${locale}.pdf?v=${cvVersion}`,
      );
      expect(file.sources[1].url, locale).toBe(
        `${cvMirrorBase}cv-${locale}.pdf?v=${cvVersion}`,
      );
      expect(file.sources[1].url, locale).toMatch(/^https:\/\//);
    }
  });

  it("offers exactly the languages that exist, as two-letter codes", () => {
    expect([...CV_ORDER].sort()).toEqual(Object.keys(cv).sort());
    expect(CV_ORDER).toEqual(["ar", "en", "fr"]);
    for (const locale of CV_ORDER) {
      expect(cv[locale].code).toMatch(/^[A-Z]{2}$/);
    }
  });
});
