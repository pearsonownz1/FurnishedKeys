"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** False during server render, true after hydration. Submit stays disabled until then. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
