import { useCallback, useEffect, useRef } from "react";

/**
 * Tracks whether the component is mounted so async work can avoid calling
 * `setState` after unmount (tab change, navigation, role switch).
 *
 * @example
 * const { safeSetState } = useMountedRef();
 * const data = await fetch();
 * safeSetState(() => setData(data));
 */
export function useMountedRef() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback(<T,>(fn: () => T): T | undefined => {
    if (mountedRef.current) {
      return fn();
    }
    return undefined;
  }, []);

  return { mountedRef, safeSetState };
}
