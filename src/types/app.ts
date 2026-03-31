/**
 * App-level types for First Choice Transportation
 * Easier to use than raw DB types; includes composite views
 */

import type {
  UserRole,
  ShiftStatus,
  StopType,
  ProfilesRow,
  DriverBasesRow,
  ShiftsRow,
  RoutePointsRow,
  ClientStopsRow,
  WeeklySummariesRow,
} from "./database";

// Re-export enums for convenience
export type { UserRole, ShiftStatus, StopType };

// =============================================================================
// PROFILE & AUTH
// =============================================================================

export interface DriverProfile extends ProfilesRow {
  role: "driver";
}

export interface AdminProfile extends ProfilesRow {
  role: "admin";
}

export type AppProfile = DriverProfile | AdminProfile;

export interface AuthSessionState {
  user: { id: string; email?: string } | null;
  profile: AppProfile | null;
  role: UserRole | null;
  isLoading: boolean;
}

export type RoleRoute = "driver" | "admin";

// =============================================================================
// DRIVER BASE
// =============================================================================

export interface DriverBase extends DriverBasesRow {
  /** Normalized base type for UI */
  baseType: "home" | "office";
}

export function toDriverBase(row: DriverBasesRow): DriverBase {
  const nameLower = row.name.toLowerCase();
  const baseType: "home" | "office" =
    nameLower === "office" ? "office" : "home";
  return { ...row, baseType };
}

/**
 * Driver home/office bases and default-for-travel selection.
 * Persisted as two `driver_bases` rows (name "Home" | "Office") plus `is_default`
 * on the row that is the default return location.
 */
export interface DriverBaseSettings {
  homeBaseAddress: string | null;
  homeBaseLatitude: number | null;
  homeBaseLongitude: number | null;
  officeBaseAddress: string | null;
  officeBaseLatitude: number | null;
  officeBaseLongitude: number | null;
  defaultBaseType: "home" | "office";
}

export function basesRowsToSettings(bases: DriverBasesRow[]): DriverBaseSettings {
  const home = bases.find((b) => b.name === "Home");
  const office = bases.find((b) => b.name === "Office");
  const defaultRow = bases.find((b) => b.is_default);
  const defaultBaseType: "home" | "office" =
    defaultRow?.name === "Office" ? "office" : "home";
  return {
    homeBaseAddress: home?.address ?? null,
    homeBaseLatitude: home?.latitude ?? null,
    homeBaseLongitude: home?.longitude ?? null,
    officeBaseAddress: office?.address ?? null,
    officeBaseLatitude: office?.latitude ?? null,
    officeBaseLongitude: office?.longitude ?? null,
    defaultBaseType,
  };
}

/** True when the chosen default base has no saved coordinates (no row or missing data). */
export function isSelectedDefaultBaseEmpty(settings: DriverBaseSettings): boolean {
  if (settings.defaultBaseType === "office") {
    return (
      settings.officeBaseLatitude == null ||
      settings.officeBaseLongitude == null
    );
  }
  return (
    settings.homeBaseLatitude == null || settings.homeBaseLongitude == null
  );
}

export interface ResolvedDefaultBaseForTravel {
  name: "Home" | "Office";
  latitude: number;
  longitude: number;
  address: string | null;
}

/** Coordinates used for travel-time calculation — only the default base type, no fallback. */
export function resolveDefaultBaseForTravel(
  settings: DriverBaseSettings
): ResolvedDefaultBaseForTravel | null {
  if (settings.defaultBaseType === "office") {
    if (
      settings.officeBaseLatitude == null ||
      settings.officeBaseLongitude == null
    ) {
      return null;
    }
    return {
      name: "Office",
      latitude: settings.officeBaseLatitude,
      longitude: settings.officeBaseLongitude,
      address: settings.officeBaseAddress,
    };
  }
  if (
    settings.homeBaseLatitude == null ||
    settings.homeBaseLongitude == null
  ) {
    return null;
  }
  return {
    name: "Home",
    latitude: settings.homeBaseLatitude,
    longitude: settings.homeBaseLongitude,
    address: settings.homeBaseAddress,
  };
}

// =============================================================================
// SHIFTS
// =============================================================================

export interface ShiftRecord extends ShiftsRow {}

export interface ShiftSummary {
  id: string;
  driverId: string;
  clockInAt: string;
  clockOutAt: string | null;
  verifiedMinutes: number | null;
  status: ShiftStatus;
  isFlagged: boolean;
  date: string;
}

export function toShiftSummary(row: ShiftsRow): ShiftSummary {
  return {
    id: row.id,
    driverId: row.driver_id,
    clockInAt: row.clock_in_at,
    clockOutAt: row.clock_out_at,
    verifiedMinutes: row.verified_hours_minutes,
    status: row.status,
    isFlagged: row.flagged_at != null,
    date: row.clock_in_at.split("T")[0] ?? row.clock_in_at,
  };
}

// =============================================================================
// SUSPICIOUS FLAGS (on shift)
// =============================================================================

export interface SuspiciousFlag {
  reason: string;
  details: Record<string, unknown> | null;
  flaggedAt: string;
}

export function toSuspiciousFlag(row: ShiftsRow): SuspiciousFlag | null {
  if (!row.flagged_at || !row.suspicious_reason) return null;
  return {
    reason: row.suspicious_reason,
    details: row.suspicious_details,
    flaggedAt: row.flagged_at,
  };
}

// =============================================================================
// ROUTE & STOPS
// =============================================================================

export interface RoutePointItem extends RoutePointsRow {}

export interface ClientStopItem extends ClientStopsRow {}

// =============================================================================
// WEEKLY SUMMARY
// =============================================================================

export interface WeeklySummaryItem extends WeeklySummariesRow {
  /** Formatted hours string e.g. "9h 15m" */
  formattedHours?: string;
}

export function toWeeklySummaryItem(
  row: WeeklySummariesRow
): WeeklySummaryItem {
  const h = Math.floor(row.total_minutes / 60);
  const m = row.total_minutes % 60;
  const formattedHours = m > 0 ? `${h}h ${m}m` : `${h}h`;
  return { ...row, formattedHours };
}

// =============================================================================
// ADMIN DASHBOARD
// =============================================================================

export interface AdminDriverListItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  weeklyMinutes: number;
  shiftCount: number;
  flaggedCount: number;
  weekStart: string;
}

export interface AdminShiftDetail {
  shift: ShiftRecord;
  driverName: string;
  driverEmail: string;
  routePoints: RoutePointItem[];
  clientStops: ClientStopItem[];
  suspiciousFlag: SuspiciousFlag | null;
  defaultBase: DriverBase | null;
}
