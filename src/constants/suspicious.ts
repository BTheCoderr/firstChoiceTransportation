/**
 * Suspicious activity detection thresholds - tune as needed
 */

/** Minutes after clock-in with no movement before flagging "no movement" */
export const NO_MOVEMENT_FLAG_MINUTES = 30;

/** Minutes from clock-in to first movement before flagging "late first movement" */
export const FIRST_MOVEMENT_DELAY_FLAG_MINUTES = 30;

/** Minutes of continuous idle after movement before flagging "long idle" */
export const LONG_IDLE_FLAG_MINUTES = 45;

/** Verified minutes above which to flag "extended shift" (e.g. 10 hours) */
export const MAX_REASONABLE_VERIFIED_MINUTES = 600;
