import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";

/**
 * Immutable snapshot returned by `useSyncExternalStore`. The object identity is stable until
 * session state meaningfully changes — never allocate a new snapshot object on each `getSnapshot` call.
 */
export type SessionSnapshot = {
  readonly session: Session | null;
};

let currentState: Session | null = null;

let cachedSnapshot: SessionSnapshot = Object.freeze({ session: null });

const listeners = new Set<() => void>();

function sessionsShallowEqual(a: Session | null, b: Session | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return (
    a.access_token === b.access_token && a.user?.id === b.user?.id
  );
}

/**
 * Rebuilds `cachedSnapshot` once and notifies subscribers. No-op if logical session is unchanged.
 */
function commitState(next: Session | null): void {
  if (sessionsShallowEqual(currentState, next)) {
    return;
  }
  currentState = next;
  cachedSnapshot = Object.freeze({ session: next });
  listeners.forEach((listener) => {
    listener();
  });
}

export function subscribeSession(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/**
 * Client snapshot — always the same reference until `setSessionState` commits a change.
 */
export function getSessionSnapshot(): SessionSnapshot {
  return cachedSnapshot;
}

/**
 * Server / hydration snapshot (React Native: same store as client).
 */
export function getServerSnapshot(): SessionSnapshot {
  return cachedSnapshot;
}

/**
 * Updates session external store. Call from auth bootstrap / `onAuthStateChange` (not from render).
 */
export function setSessionState(next: Session | null): void {
  commitState(next);
}

export function useSessionSnapshot(): SessionSnapshot {
  return useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSnapshot
  );
}
