/**
 * Idempotent navigation checks for expo-router `usePathname()` values.
 * Avoids router.replace loops when the pathname is already correct.
 */

export function pathnameMatchesAuth(pathname: string): boolean {
  return pathname === "/(auth)" || pathname.startsWith("/(auth)/");
}

export function pathnameMatchesDriver(pathname: string): boolean {
  return pathname === "/(driver)" || pathname.startsWith("/(driver)/");
}

export function pathnameMatchesAdmin(pathname: string): boolean {
  return pathname === "/(admin)" || pathname.startsWith("/(admin)/");
}

export function pathnameIsRootIndex(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function pathnameMatchesRecoveryUpdatePassword(pathname: string): boolean {
  return pathname.includes("update-password");
}
