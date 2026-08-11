export type LocalDishPreference = "mostly-local" | "balanced" | "global";

export interface RegionPreference {
  country: string;
  countryCode: string;
  localDishPreference: LocalDishPreference;
}

export const REGION_STORAGE_KEY = "diet-planner-region-v1";
export const REGION_CHANGE_EVENT = "diet-planner-region-change";

/** Countries represented by a matching area in TheMealDB's recipe catalogue. */
const COUNTRY_CUISINES: Record<string, string> = {
  Argentina: "Argentine",
  Canada: "Canadian",
  China: "Chinese",
  Croatia: "Croatian",
  Egypt: "Egyptian",
  France: "French",
  Greece: "Greek",
  India: "Indian",
  Ireland: "Irish",
  Italy: "Italian",
  Jamaica: "Jamaican",
  Japan: "Japanese",
  Kenya: "Kenyan",
  Malaysia: "Malaysian",
  Mexico: "Mexican",
  Morocco: "Moroccan",
  Netherlands: "Dutch",
  Philippines: "Filipino",
  Poland: "Polish",
  Portugal: "Portuguese",
  Russia: "Russian",
  "Saudi Arabia": "Saudi Arabian",
  Spain: "Spanish",
  Thailand: "Thai",
  Tunisia: "Tunisian",
  Turkey: "Turkish",
  Ukraine: "Ukrainian",
  "United Kingdom": "British",
  "United States": "American",
  Venezuela: "Venezuelan",
  Vietnam: "Vietnamese",
};

export function cuisineForCountry(country: string | undefined): string | null {
  return country ? COUNTRY_CUISINES[country] ?? null : null;
}

function parseRegionPreference(raw: string | null): RegionPreference | null {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<RegionPreference>;
    if (
      typeof candidate.country !== "string" ||
      typeof candidate.countryCode !== "string" ||
      !["mostly-local", "balanced", "global"].includes(candidate.localDishPreference ?? "")
    ) {
      return null;
    }
    return candidate as RegionPreference;
  } catch {
    return null;
  }
}

export function loadRegionPreference(): RegionPreference | null {
  if (typeof window === "undefined") return null;
  return parseRegionPreference(window.localStorage.getItem(REGION_STORAGE_KEY));
}

let cachedRaw: string | null | undefined;
let cachedPreference: RegionPreference | null = null;

export function regionPreferenceSnapshot(): RegionPreference | null {
  const raw = window.localStorage.getItem(REGION_STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPreference = parseRegionPreference(raw);
  }
  return cachedPreference;
}

export function serverRegionPreferenceSnapshot(): RegionPreference | null {
  return null;
}

export function subscribeRegionPreference(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(REGION_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(REGION_CHANGE_EVENT, onChange);
  };
}

export function saveRegionPreference(preference: RegionPreference): void {
  window.localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(preference));
  window.dispatchEvent(new CustomEvent(REGION_CHANGE_EVENT, { detail: preference }));
}
