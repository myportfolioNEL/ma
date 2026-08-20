import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  translations,
  type Locale,
  type TranslationBundle,
} from "../data/translations";
import type { Project } from "../types";

export type LocaleOption = {
  code: Locale;
  label: string;
  nativeName: string;
  dir: "ltr" | "rtl";
};

export const AVAILABLE_LOCALES: LocaleOption[] = [
  { code: "en", label: "EN", nativeName: "English", dir: "ltr" },
  { code: "fr", label: "FR", nativeName: "Français", dir: "ltr" },
  { code: "ar", label: "عربي", nativeName: "العربية", dir: "rtl" },
];

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationBundle;
  dir: "ltr" | "rtl";
  localizeProject: (project: Project) => Project;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem("portfolio-locale");
    if (saved === "en" || saved === "fr" || saved === "ar") {
      return saved;
    }
  } catch {
    // localStorage not accessible
  }

  try {
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith("ar")) return "ar";
    if (navLang.startsWith("fr")) return "fr";
  } catch {
    // navigator not accessible
  }

  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("portfolio-locale", newLocale);
    } catch {
      // ignore
    }
  }, []);

  const t = useMemo(() => translations[locale] || translations.en, [locale]);
  const dir = t.dir;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.documentElement.style.setProperty("--dir", dir === "rtl" ? "-1" : "1");
  }, [locale, dir]);

  const localizeProject = useCallback(
    (project: Project): Project => {
      const projTr = t.projects[project.id];
      if (!projTr) return project;
      return {
        ...project,
        kind: projTr.kind,
        subtitle: projTr.subtitle,
        context: projTr.context,
        role: projTr.role,
        collaboration: projTr.collaboration,
        timeline: projTr.timeline,
        scale: projTr.scale,
        overview: projTr.overview,
        challenge: projTr.challenge,
        build: projTr.build,
        outcome: projTr.outcome,
        imageAlt: projTr.imageAlt,
      };
    },
    [t],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      dir,
      localizeProject,
    }),
    [locale, setLocale, t, dir, localizeProject],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
