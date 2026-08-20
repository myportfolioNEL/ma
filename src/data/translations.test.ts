import { describe, expect, it } from "vitest";
import {
  translations,
  type Locale,
  type TranslationBundle,
} from "./translations";
import { projects } from "./projects";

const LOCALES: Locale[] = ["en", "fr", "ar"];

/**
 * Every key path in a bundle, with array indices collapsed to "[]".
 *
 * Collapsing indices is deliberate: one language is allowed to need four
 * paragraphs where another needs three, but no language is allowed to be
 * missing a key or to spell one differently.
 */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [prefix + "[]"];
    return value.flatMap((item) => keyPaths(item, prefix + "[]"));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, child]) => keyPaths(child, prefix === "" ? key : prefix + "." + key),
    );
  }
  return [prefix];
}

function shapeOf(bundle: TranslationBundle): string[] {
  return Array.from(new Set(keyPaths(bundle))).sort();
}

/** Every string in the bundle, with the path that leads to it. */
function strings(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      strings(item, prefix + "[" + index + "]"),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, child]) => strings(child, prefix === "" ? key : prefix + "." + key),
    );
  }
  return [];
}

/**
 * Lists that must have the same length in all three languages, because the UI
 * lays them out side by side. Prose lists are intentionally not here.
 *
 * Later rounds add "decisions" and "perf" to this array. That is not optional.
 */
const COUNTED: Array<{ name: string; pick: (b: TranslationBundle) => unknown[] }> = [
  { name: "navItems", pick: (b) => b.navItems },
  { name: "profile.facts", pick: (b) => b.profile.facts },
  { name: "profile.languages", pick: (b) => b.profile.languages },
  { name: "metrics", pick: (b) => b.metrics },
  { name: "capabilities", pick: (b) => b.capabilities },
];

describe("translations", () => {
  it("declares all three locales", () => {
    expect(Object.keys(translations).sort()).toEqual(["ar", "en", "fr"]);
    for (const locale of LOCALES) {
      expect(translations[locale].locale).toBe(locale);
    }
    expect(translations.ar.dir).toBe("rtl");
    expect(translations.en.dir).toBe("ltr");
    expect(translations.fr.dir).toBe("ltr");
  });

  it("has the same key shape in every locale", () => {
    const reference = shapeOf(translations.en);
    for (const locale of LOCALES) {
      expect(shapeOf(translations[locale]), "locale " + locale).toEqual(reference);
    }
  });

  it("has no empty or whitespace-only string", () => {
    for (const locale of LOCALES) {
      const empty = strings(translations[locale])
        .filter(([, text]) => text.trim().length === 0)
        .map(([path]) => locale + "." + path);
      expect(empty).toEqual([]);
    }
  });

  it("keeps counted lists the same length in every locale", () => {
    for (const list of COUNTED) {
      const reference = list.pick(translations.en).length;
      for (const locale of LOCALES) {
        expect(
          list.pick(translations[locale]).length,
          list.name + " in " + locale,
        ).toBe(reference);
      }
    }
  });

  it("keeps the same nav ids in every locale", () => {
    const reference = translations.en.navItems.map((item) => item.id);
    for (const locale of LOCALES) {
      expect(
        translations[locale].navItems.map((item) => item.id),
        "navItems in " + locale,
      ).toEqual(reference);
    }
  });

  /**
   * The defect this one exists for: a list keyed by id, and a second map that
   * is supposed to have the same keys. In my NL repository five ids were added
   * to one list while the map that resolved their images kept nine keys, and
   * five tiles shipped blank. Same class of bug, different repository.
   */
  it("has a translation for every project id, in every locale", () => {
    const ids = projects.map((project) => project.id).sort();
    expect(ids.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      expect(
        Object.keys(translations[locale].projects).sort(),
        "projects in " + locale,
      ).toEqual(ids);
    }
  });
});
