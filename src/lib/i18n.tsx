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
  /** ISO 3166-1 alpha-2 code (lowercase) of a country that speaks it, for flag-icons */
  flagCountry: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", flagCountry: "gb" },
  { code: "es", label: "Español", flagCountry: "es" },
  { code: "fr", label: "Français", flagCountry: "fr" },
  { code: "de", label: "Deutsch", flagCountry: "de" },
  { code: "it", label: "Italiano", flagCountry: "it" },
  { code: "uk", label: "Українська", flagCountry: "ua" },
  { code: "pl", label: "Polski", flagCountry: "pl" },
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

/** Fired on the window when the language changes, so every subscriber re-reads it. */
const LANG_EVENT = "planlang-change";

function subscribeLang(onChange: () => void): () => void {
  window.addEventListener(LANG_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LANG_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Snapshots are plain strings, so identity comparison is safe without caching. */
function langSnapshot(): string {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved && DICTS[saved] ? saved : "en";
}

/** The server has no localStorage, so it always renders English and React swaps after. */
function serverLangSnapshot(): string {
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Reading through useSyncExternalStore rather than an effect: localStorage is external
  // state, and setting it in an effect caused a cascading render on every page load.
  const lang = React.useSyncExternalStore(subscribeLang, langSnapshot, serverLangSnapshot);

  const setLang = React.useCallback((code: string) => {
    if (!DICTS[code]) return;
    localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;
    window.dispatchEvent(new Event(LANG_EVENT));
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
