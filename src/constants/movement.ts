/**
 * Movement detection thresholds - tune as needed
 */

/** Minimum speed for movement (m/s). ~2 mph ≈ 0.89 m/s */
export const MOVEMENT_SPEED_THRESHOLD_MS = 0.9;

/** Minimum distance from prior point to count as movement (meters) */
export const MOVEMENT_DISTANCE_THRESHOLD_M = 50;

/** Minutes after clock-in with no movement before marking idle at start */
export const IDLE_AT_START_THRESHOLD_MINUTES = 15;

/** Minutes of no movement after moving before returning to idle */
export const IDLE_AFTER_MOVEMENT_THRESHOLD_MINUTES = 15;
