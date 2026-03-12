# Single-Company Consistency Audit

## Summary

The app is **largely consistent** with the single-company MVP design. A few minor cleanups remain; none are blocking.

---

## 1. Remaining Inconsistencies

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | `useAdminDashboard` accepts `companyId: string \| null` and has `if (!companyId)` early return | Minor | `src/hooks/useAdminDashboard.ts` |
| 2 | Admin placeholder text "No drivers in your company" – acceptable but could be simplified | Optional | `app/(admin)/index.tsx` |

---

## 2. Files That Need Cleanup

| File | Change |
|------|--------|
| `src/hooks/useAdminDashboard.ts` | Simplify to `companyId: string` only; remove null check |

---

## 3. Exact Fixes Needed

### `src/hooks/useAdminDashboard.ts`

**Current:**
```typescript
export function useAdminDashboard(companyId: string | null): UseAdminDashboardResult {
  // ...
  const refresh = useCallback(async () => {
    if (!companyId) {
      setDrivers([]);
      setRecentShifts([]);
      setIsLoading(false);
      return;
    }
    // ...
  }, [companyId]);
```

**Fix:**
```typescript
export function useAdminDashboard(companyId: string): UseAdminDashboardResult {
  // ...
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [driversData, shiftsData] = await Promise.all([
        getCompanyDriversWithWeeklyStats(companyId),
        getRecentCompanyShifts(companyId),
      ]);
      // ... rest unchanged, remove the if (!companyId) block
```

---

## 4. What Is Already Consistent

| Area | Status |
|------|--------|
| **profile.company_id** | Not used in app logic; driver and admin use `SINGLE_COMPANY_ID` directly |
| **company_id null** | Addressed by migrations 007/008 and synthetic profile |
| **Company-scoped queries** | All use `SINGLE_COMPANY_ID` (driver index, admin index, admin service `getDriverDetail`) |
| **"No company assigned"** | Removed; no such UI or logic in app code |
| **Driver Start Shift** | Uses `SINGLE_COMPANY_ID`; no profile dependency for company |
| **Admin Dashboard** | Uses `SINGLE_COMPANY_ID`; no profile dependency |
| **Admin service** | `getCompanyDriversWithWeeklyStats`, `getRecentCompanyShifts` receive constant from caller; `getDriverDetail` uses `SINGLE_COMPANY_ID` for weekly query |
| **AuthProvider synthetic profile** | Sets `company_id: SINGLE_COMPANY_ID` |
| **RLS policies** | Rely on `profiles.company_id`; migrations ensure it is set |

---

## 5. Optional Cleanup (Low Priority)

- **"No drivers in your company"** → **"No drivers yet"** – clearer for single-company but not required.
- **Database types** – `ProfilesRow.company_id: string | null` matches schema; migrations fix data. No change needed.

---

## Conclusion

The app is **consistent with the single-company MVP**. The only recommended change is simplifying `useAdminDashboard` to drop the null branch and `string | null` type.
