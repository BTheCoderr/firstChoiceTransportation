import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function read(path) { return readFileSync(new URL("../" + path, import.meta.url), "utf8"); }
function loadTypeScript(path) {
  const source = read(path);
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  }}).outputText;
  const module = { exports: {} };
  new Function("module", "exports", js)(module, module.exports);
  return module.exports;
}
const { assessRouteEvidence } = loadTypeScript("src/utils/gpsDiagnostics.ts");
const { parseLocalReviewTime, formatLocalReviewTime } = loadTypeScript("src/utils/shiftReviewTime.ts");

const base = { start_lat: 41.82, start_lng: -71.41,
  return_base_lat: 41.83, return_base_lng: -71.42,
  clock_in_at: "2026-10-13T14:00:00Z", clock_out_at: "2026-10-13T22:00:00Z" };
function point(latitude, longitude, accuracy = 20, recorded_at = "2026-10-13T15:00:00Z") {
  return { latitude, longitude, accuracy, recorded_at, speed: 2 };
}
assert.deepEqual(assessRouteEvidence(point(41.82, -71.41), base), []);
assert.match(assessRouteEvidence(point(39.9, 116.4), base).join(";"), /outside the expected US/);
assert.match(assessRouteEvidence(point(39.9, 116.4), base).join(";"), /250 km/);
assert.match(assessRouteEvidence(point(41.82, -71.41, 900), base).join(";"), /Low-confidence/);
assert.match(assessRouteEvidence(point(41.82, -71.41, 10, "2026-10-11T12:00:00Z"), base).join(";"), /outside the shift time/);
assert.equal(parseLocalReviewTime("2026-02-30", "12:00"), null);
assert.equal(parseLocalReviewTime("2026-10-14", "25:00"), null);
assert.equal(parseLocalReviewTime("2026-10-14", "15:45")?.getHours(), 15);
assert.deepEqual(formatLocalReviewTime("2026-10-14T15:45:00Z").date.length, 10);
const migration = read("supabase/migrations/027_admin_payroll_decisions.sql");
assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
assert.match(migration, /REVOKE ALL ON public.shift_payroll_reviews/);
assert.match(migration, /admin_decide_shift_payroll/);
assert.match(migration, /ON CONFLICT \(shift_id\)/);
assert.match(migration, /SHIFT_STILL_OPEN/);
assert.match(migration, /USE_RECOVERY_APPROVAL/);
assert.match(migration, /trg_record_recovered_payroll_decision/);
assert.match(migration, /record_recovered_payroll_decision/);
assert.match(migration, /INSERT INTO public.shift_payroll_review_events/);
assert.doesNotMatch(migration, /UPDATE public\.shifts/);
assert.doesNotMatch(migration, /DELETE FROM public\.shifts/);
const service = read("src/services/admin.ts");
assert.match(service, /cur\.minutes \+= approved\.get\(s\.id\) \?\? 0/);
assert.doesNotMatch(service, /cur\.minutes \+= s\.verified_hours_minutes/);
assert.match(read("src/components/admin/AdminShiftDecisionPanel.tsx"), /Confirm decision and save audit/);
assert.match(read("app/(admin)/reviews.tsx"), /Shift Review Center/);
assert.match(read("src/components/help/HelpGuide.tsx"), /Administrator Guide/);
console.log("Admin review, GPS anomaly, local time and ledger QA passed.");
