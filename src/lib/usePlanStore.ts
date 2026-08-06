"use client";

import { useSyncExternalStore } from "react";
import { serverStoreSnapshot, storeSnapshot, subscribeStore } from "./storage";
import type { PlanStore } from "./types";

/**
 * The device's plan library, kept in sync with localStorage.
 *
 * Every component that reads the store should use this rather than calling `loadStore()`
 * in an effect: it stays current when another component (or another tab) saves, and it
 * renders the right thing on the very first client paint.
 */
export function usePlanStore(): PlanStore {
  return useSyncExternalStore(subscribeStore, storeSnapshot, serverStoreSnapshot);
}
