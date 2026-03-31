import { useCallback, useEffect, useReducer, useRef } from "react";
import { AppState } from "react-native";
import {
  getForegroundPermissionState,
  getBackgroundPermissionState,
  requestForegroundPermission,
  requestBackgroundPermission,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isLocationTrackingActive,
  type PermissionGateState,
} from "@/services/location";
import {
  LOCATION_PERMISSION_DIALOG_TIMEOUT_MS,
  TRACKING_SHIFT_ID_KEY,
} from "@/constants/location";
import * as SecureStore from "expo-secure-store";
import { withTimeout } from "@/utils/withTimeout";

/** Single source of truth for route-tracking UX (no mixed booleans). */
export type TrackingFlowStatus =
  | "idle"
  | "needs_permission"
  | "starting"
  | "active"
  | "error";

type OpKind = "none" | "permissions" | "start_tracking";

const REQUEST_PERMISSIONS_HARD_CAP_MS =
  LOCATION_PERMISSION_DIALOG_TIMEOUT_MS + 5_000;

const START_TRACKING_PIPELINE_MAX_MS =
  LOCATION_PERMISSION_DIALOG_TIMEOUT_MS * 2 + 30_000;

/** Prevents refreshState / SecureStore from hanging the tracking lock forever. */
const REFRESH_STATE_MAX_MS = 15_000;
const SECURE_STORE_READ_MAX_MS = 5_000;
/** Each isLocationTrackingActive poll must settle (withTimeout fallback). */
const NATIVE_ACTIVE_POLL_CALL_MS = 8_000;

type TrackingState = {
  flow: TrackingFlowStatus;
  errorMessage: string | null;
  permissionReady: boolean;
  foregroundPermission: PermissionGateState | "loading";
  backgroundPermission: PermissionGateState | "loading";
  hasForegroundPermission: boolean;
  hasBackgroundPermission: boolean;
  isTracking: boolean;
  trackingShiftId: string | null;
  opKind: OpKind;
};

type Action =
  | { type: "OP_BEGIN"; kind: "permissions" | "start_tracking" }
  | { type: "OP_FAIL"; message: string }
  | { type: "CLEAR_ERROR" }
  | {
      type: "SNAPSHOT";
      fg: PermissionGateState;
      bg: PermissionGateState;
      nativeTracking: boolean;
      trackingShiftId: string | null;
    };

function deriveFlowFromPermissions(
  fg: PermissionGateState,
  bg: PermissionGateState
): "idle" | "needs_permission" {
  const fgOk = fg === "granted";
  const bgOk = bg === "granted";
  if (!fgOk || !bgOk) return "needs_permission";
  return "idle";
}

function reducer(state: TrackingState, action: Action): TrackingState {
  switch (action.type) {
    case "OP_BEGIN":
      return {
        ...state,
        flow: "starting",
        errorMessage: null,
        opKind: action.kind,
      };
    case "OP_FAIL":
      return {
        ...state,
        flow: "error",
        errorMessage: action.message,
        opKind: "none",
      };
    case "CLEAR_ERROR": {
      if (state.flow !== "error") return state;
      const fg =
        state.foregroundPermission === "loading"
          ? "undetermined"
          : state.foregroundPermission;
      const bg =
        state.backgroundPermission === "loading"
          ? "undetermined"
          : state.backgroundPermission;
      if (state.isTracking) {
        return { ...state, flow: "active", errorMessage: null };
      }
      const nextFlow = deriveFlowFromPermissions(fg, bg);
      return { ...state, flow: nextFlow, errorMessage: null };
    }
    case "SNAPSHOT": {
      const { fg, bg, nativeTracking, trackingShiftId } = action;
      const fgG = fg === "granted";
      const bgG = bg === "granted";

      if (nativeTracking) {
        return {
          ...state,
          permissionReady: true,
          foregroundPermission: fg,
          backgroundPermission: bg,
          hasForegroundPermission: fgG,
          hasBackgroundPermission: bgG,
          isTracking: true,
          trackingShiftId,
          flow: "active",
          errorMessage: null,
          opKind: "none",
        };
      }

      if (state.flow === "error") {
        return {
          ...state,
          permissionReady: true,
          foregroundPermission: fg,
          backgroundPermission: bg,
          hasForegroundPermission: fgG,
          hasBackgroundPermission: bgG,
          isTracking: false,
          trackingShiftId: null,
        };
      }

      if (state.flow === "starting") {
        if (state.opKind === "permissions") {
          const nextFlow = deriveFlowFromPermissions(fg, bg);
          return {
            ...state,
            permissionReady: true,
            foregroundPermission: fg,
            backgroundPermission: bg,
            hasForegroundPermission: fgG,
            hasBackgroundPermission: bgG,
            isTracking: false,
            trackingShiftId: null,
            flow: nextFlow,
            opKind: "none",
            errorMessage: null,
          };
        }
        if (state.opKind === "start_tracking") {
          const permFlow = deriveFlowFromPermissions(fg, bg);
          if (!nativeTracking && permFlow === "needs_permission") {
            return {
              ...state,
              permissionReady: true,
              foregroundPermission: fg,
              backgroundPermission: bg,
              hasForegroundPermission: fgG,
              hasBackgroundPermission: bgG,
              isTracking: false,
              trackingShiftId: null,
              flow: "needs_permission",
              opKind: "none",
              errorMessage: null,
            };
          }
          return {
            ...state,
            permissionReady: true,
            foregroundPermission: fg,
            backgroundPermission: bg,
            hasForegroundPermission: fgG,
            hasBackgroundPermission: bgG,
            isTracking: false,
            trackingShiftId: null,
          };
        }
      }

      if (state.flow === "active" && !nativeTracking) {
        const nextFlow = deriveFlowFromPermissions(fg, bg);
        return {
          ...state,
          permissionReady: true,
          foregroundPermission: fg,
          backgroundPermission: bg,
          hasForegroundPermission: fgG,
          hasBackgroundPermission: bgG,
          isTracking: false,
          trackingShiftId: null,
          flow: nextFlow,
          errorMessage: null,
          opKind: "none",
        };
      }

      const nextFlow = deriveFlowFromPermissions(fg, bg);
      return {
        ...state,
        permissionReady: true,
        foregroundPermission: fg,
        backgroundPermission: bg,
        hasForegroundPermission: fgG,
        hasBackgroundPermission: bgG,
        isTracking: false,
        trackingShiftId: null,
        flow: nextFlow,
        errorMessage: null,
      };
    }
    default:
      return state;
  }
}

const initialState: TrackingState = {
  flow: "idle",
  errorMessage: null,
  permissionReady: false,
  foregroundPermission: "loading",
  backgroundPermission: "loading",
  hasForegroundPermission: false,
  hasBackgroundPermission: false,
  isTracking: false,
  trackingShiftId: null,
  opKind: "none",
};

async function ensureForegroundAndBackgroundForTracking(): Promise<boolean> {
  let fg = await getForegroundPermissionState();
  if (fg.state !== "granted") {
    const granted = await requestForegroundPermission();
    if (!granted) return false;
    fg = await getForegroundPermissionState();
    if (fg.state !== "granted") return false;
  }

  let bg = await getBackgroundPermissionState();
  if (bg.state !== "granted") {
    const granted = await requestBackgroundPermission();
    if (!granted) return false;
    bg = await getBackgroundPermissionState();
    if (bg.state !== "granted") return false;
  }

  return true;
}

/** Native task + SecureStore can lag briefly after startLocationUpdatesAsync resolves. */
async function waitForNativeTrackingActive(maxMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const active = await withTimeout(
      isLocationTrackingActive(),
      NATIVE_ACTIVE_POLL_CALL_MS,
      false
    );
    if (active) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

export interface UseShiftLocationTrackingResult {
  trackingFlowStatus: TrackingFlowStatus;
  errorMessage: string | null;
  permissionReady: boolean;
  foregroundPermission: PermissionGateState | "loading";
  hasForegroundPermission: boolean;
  hasBackgroundPermission: boolean;
  isTracking: boolean;
  trackingShiftId: string | null;
  clearTrackingError: () => void;
  requestPermissions: () => Promise<boolean>;
  startTracking: (shiftId: string) => Promise<boolean>;
  stopTracking: () => Promise<void>;
  /** false = timed out (snapshot set to unavailable); callers in user ops should treat as failure */
  refreshState: () => Promise<boolean>;
}

export function useShiftLocationTracking(): UseShiftLocationTrackingResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refreshGenRef = useRef(0);
  const operationLockRef = useRef(false);

  const refreshState = useCallback(async (): Promise<boolean> => {
    const gen = ++refreshGenRef.current;

    type Snap = {
      fg: PermissionGateState;
      bg: PermissionGateState;
      nativeTracking: boolean;
      trackingShiftId: string | null;
    };

    const outcome = await withTimeout(
      (async (): Promise<Snap | null | "TIMEOUT"> => {
        try {
          const [fg, bg, active] = await Promise.all([
            getForegroundPermissionState(),
            getBackgroundPermissionState(),
            isLocationTrackingActive(),
          ]);
          if (gen !== refreshGenRef.current) return null;

          let tid: string | null = null;
          if (active) {
            tid = await withTimeout(
              SecureStore.getItemAsync(TRACKING_SHIFT_ID_KEY),
              SECURE_STORE_READ_MAX_MS,
              null
            );
          }

          if (gen !== refreshGenRef.current) return null;

          return {
            fg: fg.state,
            bg: bg.state,
            nativeTracking: active,
            trackingShiftId: tid,
          };
        } catch {
          if (gen !== refreshGenRef.current) return null;
          return {
            fg: "unavailable",
            bg: "unavailable",
            nativeTracking: false,
            trackingShiftId: null,
          };
        }
      })(),
      REFRESH_STATE_MAX_MS,
      "TIMEOUT" as const
    );

    if (outcome === "TIMEOUT") {
      if (gen === refreshGenRef.current) {
        dispatch({
          type: "SNAPSHOT",
          fg: "unavailable",
          bg: "unavailable",
          nativeTracking: false,
          trackingShiftId: null,
        });
      }
      return false;
    }

    if (outcome === null) return true;

    dispatch({
      type: "SNAPSHOT",
      fg: outcome.fg,
      bg: outcome.bg,
      nativeTracking: outcome.nativeTracking,
      trackingShiftId: outcome.trackingShiftId,
    });
    return true;
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refreshState();
    });
    return () => sub.remove();
  }, [refreshState]);

  const runLocked = useCallback(
    async (
      kind: "permissions" | "start_tracking",
      fn: () => Promise<boolean>
    ): Promise<boolean> => {
      if (operationLockRef.current) {
        return false;
      }
      operationLockRef.current = true;
      dispatch({ type: "OP_BEGIN", kind });
      try {
        return await fn();
      } catch {
        dispatch({
          type: "OP_FAIL",
          message: "Something went wrong. Please try again.",
        });
        return false;
      } finally {
        operationLockRef.current = false;
      }
    },
    []
  );

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    return runLocked("permissions", async () => {
      const ok = await withTimeout(
        ensureForegroundAndBackgroundForTracking(),
        REQUEST_PERMISSIONS_HARD_CAP_MS,
        false
      );
      if (!ok) {
        dispatch({
          type: "OP_FAIL",
          message:
            "Location permission was denied or timed out. Allow While Using and Always (background), or open Settings.",
        });
        return false;
      }
      const refreshed = await refreshState();
      if (!refreshed) {
        dispatch({
          type: "OP_FAIL",
          message:
            "Could not refresh location status. Pull to refresh or open Settings.",
        });
        return false;
      }
      return true;
    });
  }, [refreshState, runLocked]);

  const startTracking = useCallback(
    async (shiftId: string): Promise<boolean> => {
      return runLocked("start_tracking", async () => {
        let ok = await withTimeout(
          ensureForegroundAndBackgroundForTracking(),
          REQUEST_PERMISSIONS_HARD_CAP_MS,
          false
        );
        if (!ok) {
          dispatch({
            type: "OP_FAIL",
            message:
              "Background location is required. Choose Always when prompted, or enable it in Settings → First Choice Transportation → Location.",
          });
          return false;
        }

        ok = await withTimeout(
          startBackgroundLocationTracking(shiftId),
          START_TRACKING_PIPELINE_MAX_MS,
          false
        );
        if (!ok) {
          dispatch({
            type: "OP_FAIL",
            message:
              "Could not start route tracking. Confirm Always location access and try again.",
          });
          return false;
        }

        const live = await withTimeout(
          waitForNativeTrackingActive(12_000),
          14_000,
          false
        );
        if (!live) {
          dispatch({
            type: "OP_FAIL",
            message:
              "Tracking did not become active in time. Check Location is set to Always, then try again.",
          });
          return false;
        }

        const refreshed = await refreshState();
        if (!refreshed) {
          dispatch({
            type: "OP_FAIL",
            message:
              "Could not confirm tracking status. Try Start tracking again.",
          });
          return false;
        }
        return true;
      });
    },
    [refreshState, runLocked]
  );

  const stopTracking = useCallback(async () => {
    try {
      await stopBackgroundLocationTracking();
    } finally {
      await refreshState();
    }
  }, [refreshState]);

  const clearTrackingError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
    void refreshState();
  }, [refreshState]);

  return {
    trackingFlowStatus: state.flow,
    errorMessage: state.errorMessage,
    permissionReady: state.permissionReady,
    foregroundPermission: state.foregroundPermission,
    hasForegroundPermission: state.hasForegroundPermission,
    hasBackgroundPermission: state.hasBackgroundPermission,
    isTracking: state.isTracking,
    trackingShiftId: state.trackingShiftId,
    clearTrackingError,
    requestPermissions,
    startTracking,
    stopTracking,
    refreshState,
  };
}
