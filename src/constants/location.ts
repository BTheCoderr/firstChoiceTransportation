/**
 * Location tracking constants
 */

export const LOCATION_TASK_NAME = "BACKGROUND_LOCATION_TASK";

export const TRACKING_SHIFT_ID_KEY = "active_tracking_shift_id";

/** Minimum interval between location updates (ms) */
export const LOCATION_UPDATE_INTERVAL_MS = 30_000;

/** Minimum distance before a new update (meters) */
export const LOCATION_DISTANCE_INTERVAL_M = 50;

/** Max wait for a single GPS fix (user-facing) */
export const LOCATION_REQUEST_TIMEOUT_MS = 5_000;

/**
 * Max wait for reading permission / tracking state from native APIs (3–5s).
 */
export const LOCATION_PERMISSION_CHECK_TIMEOUT_MS = 4_000;

/**
 * Max wait for system permission dialogs (user may pause). Prevents hung JS.
 */
export const LOCATION_PERMISSION_DIALOG_TIMEOUT_MS = 90_000;

/** Cap for starting background location updates */
export const LOCATION_TRACKING_START_TIMEOUT_MS = 12_000;

/** Cap for deferred task module import before starting tracking */
export const LOCATION_TASK_IMPORT_TIMEOUT_MS = 10_000;
