"use client";

/**
 * Small self-contained i18n layer — no external library.
 *
 * The selected language lives in localStorage and in a React context. `useT()` returns
 * a translate function `t(key, vars?)` that interpolates {placeholders} and falls back
 * to English for any key a language hasn't translated yet, so the app is never broken by
 * a missing string — it just shows English there.
 *
 * Note: this translates the app's own UI text. Recipe names, cuisine descriptions and
 * USDA food names stay in their real published language (English) because they're
 * sourced data, not our copy — translating them would be inventing.
 */

import * as React from "react";
import en from "@/lang/en";
import es from "@/lang/es";
import fr from "@/lang/fr";
import de from "@/lang/de";
import it from "@/lang/it";
import uk from "@/lang/uk";
import pl from "@/lang/pl";

export interface Language {
  code: string;
  /** endonym — the language's name in itself */
  label: string;
  /** flag of a country that speaks it */
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
];

type Dict = Record<string, string>;

const DICTS: Record<string, Dict> = { en, es, fr, de, it, uk, pl };

const STORAGE_KEY = "diet-planner-lang";

interface I18nValue {
  lang: string;
  setLang: (code: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nValue | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState("en");

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) setLangState(saved);
  }, []);

  const setLang = React.useCallback((code: string) => {
    if (!DICTS[code]) return;
    setLangState(code);
    localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;
  }, []);

  const t = React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTS[lang] ?? DICTS.en;
      const template = dict[key] ?? DICTS.en[key] ?? key;
      return interpolate(template, vars);
    },
    [lang],
  );

  const value = React.useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Convenience: just the translate function. */
export function useT() {
  return useI18n().t;
}
