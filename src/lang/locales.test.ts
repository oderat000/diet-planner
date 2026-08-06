import { describe, expect, it } from "vitest";
import en from "./en";
import es from "./es";
import fr from "./fr";
import de from "./de";
// aliased: the Italian dictionary's natural name collides with vitest's `it`
import italian from "./it";
import uk from "./uk";
import pl from "./pl";

/**
 * The app ships a language switcher, so a locale missing keys silently renders English
 * in the middle of a translated page. `t()` falls back rather than crashing, which makes
 * the gap invisible — hence this test.
 */
const LOCALES: Record<string, Record<string, string>> = { es, fr, de, it: italian, uk, pl };
const enKeys = Object.keys(en).sort();

describe("locale dictionaries", () => {
  it.each(Object.keys(LOCALES))("%s covers every English key", (code) => {
    const missing = enKeys.filter((k) => !(k in LOCALES[code]));
    expect(missing, `${code} is missing ${missing.length} key(s)`).toEqual([]);
  });

  it.each(Object.keys(LOCALES))("%s defines no key English lacks", (code) => {
    const orphans = Object.keys(LOCALES[code]).filter((k) => !(k in en));
    expect(orphans, `${code} has keys not in en.ts`).toEqual([]);
  });

  it.each(Object.keys(LOCALES))("%s has no blank translations", (code) => {
    const blank = Object.entries(LOCALES[code])
      .filter(([, v]) => typeof v !== "string" || v.trim() === "")
      .map(([k]) => k);
    expect(blank).toEqual([]);
  });

  it("keeps {placeholder} tokens consistent with English", () => {
    const tokens = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();
    for (const [code, dict] of Object.entries(LOCALES)) {
      for (const key of enKeys) {
        const value = dict[key];
        if (!value) continue;
        // A dropped or renamed placeholder renders as literal "{kcal}" to the user.
        expect(tokens(value), `${code} → ${key}`).toEqual(tokens(en[key as keyof typeof en]));
      }
    }
  });
});
