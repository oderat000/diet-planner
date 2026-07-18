import { deriveGoal } from "./plan";
import { AppState, DietPlan, PlanStore, Profile, SavedPlan, WeightEntry } from "./types";

const STORE_KEY = "diet-planner-store-v1";
const LEGACY_KEY = "diet-planner-v1";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function emptyStore(): PlanStore {
  return { plans: [], activeId: null };
}

/** Human-friendly default name for a plan, e.g. "Lose → 75 kg · Jul 9". */
export function planName(profile: Profile, createdAt: string): string {
  const g = deriveGoal(profile);
  const goal = g === "lose" ? "Lose" : g === "gain" ? "Gain" : "Maintain";
  const md = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${goal} → ${profile.goalWeightKg} kg · ${md}`;
}

function fromLegacy(s: AppState): SavedPlan {
  const createdAt = s.plan?.createdAt ?? new Date().toISOString();
  return {
    id: uid(),
    name: planName(s.profile, createdAt),
    profile: s.profile,
    plan: s.plan,
    weights: s.weights ?? [],
    checks: s.checks ?? {},
    createdAt,
  };
}

export function loadStore(): PlanStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as PlanStore;

    // One-time migration from the old single-plan format.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = fromLegacy(JSON.parse(legacy) as AppState);
      const store: PlanStore = { plans: [migrated], activeId: migrated.id };
      saveStore(store);
      window.localStorage.removeItem(LEGACY_KEY);
      return store;
    }
    return emptyStore();
  } catch {
    return emptyStore();
  }
}

/** Event fired on the window whenever the plan store changes (same tab). */
export const STORE_EVENT = "planstore-change";

export function saveStore(store: PlanStore) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function getActivePlan(store: PlanStore): SavedPlan | null {
  return store.plans.find((p) => p.id === store.activeId) ?? null;
}

/** Save a freshly generated plan as a new library entry and make it active. */
export function addPlan(
  profile: Profile,
  plan: DietPlan,
  weights: WeightEntry[],
): PlanStore {
  const createdAt = new Date().toISOString();
  const saved: SavedPlan = {
    id: uid(),
    name: planName(profile, createdAt),
    profile,
    plan,
    weights,
    checks: {},
    createdAt,
  };
  const store = loadStore();
  const next: PlanStore = {
    plans: [...store.plans, saved],
    activeId: saved.id,
  };
  saveStore(next);
  return next;
}

/** Patch the currently active plan (e.g. new weights or meal checks). */
export function updateActivePlan(
  store: PlanStore,
  patch: Partial<SavedPlan>,
): PlanStore {
  const next: PlanStore = {
    ...store,
    plans: store.plans.map((p) =>
      p.id === store.activeId ? { ...p, ...patch } : p,
    ),
  };
  saveStore(next);
  return next;
}

export function renameActivePlan(store: PlanStore, name: string): PlanStore {
  return updateActivePlan(store, { name });
}

export function setActivePlan(store: PlanStore, id: string): PlanStore {
  const next: PlanStore = { ...store, activeId: id };
  saveStore(next);
  return next;
}

export function deletePlan(store: PlanStore, id: string): PlanStore {
  const plans = store.plans.filter((p) => p.id !== id);
  const activeId =
    store.activeId === id ? (plans[0]?.id ?? null) : store.activeId;
  const next: PlanStore = { plans, activeId };
  saveStore(next);
  return next;
}

/** Local date as YYYY-MM-DD */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
