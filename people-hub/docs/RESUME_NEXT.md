# Resume Next — v0.9 Historical Data Migration (BUILD: importer + harness)

Design approved (docs/STAGE8_v0_9_DESIGN.md). Steps 1-3 DONE + committed. Next: step 4
(importer) then step 5 (harness). All synthetic data; no real data before the v0.10 gate.
Setup if restarted: `npm run typecheck`, `npm run db:reset`. Do NOT upgrade Prisma.
SheetJS `xlsx` 0.18.5 installed. Regenerate fixtures: `npx tsx scripts/generate-synthetic-workbooks.ts`.

## Done + committed (steps 1-3)
- scripts/lib/review-template-anchors.ts — shared anchors (single source of truth).
  Quarterly criterion rows: Q1 19/23/27, Q2-Q4 20/24/28. Header C4/C5/C6/C7. Cols: mgr C,
  mgrComment D, self E, selfComment F. VALUES: rows 7-10, mgr col D, self col E, keys =
  the app's real VALUES_ITEMS codes (INNOVATE_WITH_IMPACT, DRIVE_EXCEPTIONAL_RESULTS,
  DELIVER_VALUE_TO_CUSTOMERS, WIN_COLLECTIVELY). normaliseName() helper here too.
- scripts/generate-synthetic-workbooks.ts — builds 5 fixtures + EXPECTATIONS.json into
  scripts/synthetic-workbooks/ (gitignored): alice_tester (clean, officials 4.3/3.7/4.3/4.7,
  4 values), bob_sample (Q1-Q2 only, partial), carol_messy (Q3 impact = "5 - Advanced" ->
  quarantine), no_name (-> quarantine), dave_unknown (extracts OK, quarantines at IMPORTER as
  not-in-Hub).
- scripts/lib/extract-workbook.ts — PURE, DB-free. extractWorkbook(wb) -> {ok, employeeName,
  managerName, department, quarters[], values[]} OR {ok:false, employeeName, reasons[]}.
  Whole-file quarantine on ANY invalid rating (must be int 1-5); absent quarter skipped, not
  errored. quarterlyOfficial(q) helper. VERIFIED against all 5 fixtures.

## STEP 4 — importer: scripts/migrate-history.ts (DB-writing core) — DESIGN LOCKED
Export `importWorkbooks(dir, { periodLabel, actorEmail }): Promise<ImportReport>` + thin CLI
wrapper (harness calls the function directly). Per file:
- extractWorkbook(); if !ok -> quarantine with reasons.
- Match employee by normaliseName(displayName) -> exactly one Hub employee. none/ambiguous ->
  quarantine ("employee not found" / "ambiguous name match"). (Dave quarantines here.)
- Manager: USE THE HUB EMPLOYEE'S existing managerId (ignore workbook manager name; note it in
  audit detail). If Hub employee has NO manager -> quarantine ("no manager in Hub").
- Period/cycles: FIND-OR-CREATE for the explicit periodLabel (e.g. "2025"): the ReviewPeriod +
  4 QUARTERLY cycles (one per quarter) + 1 ANNUAL_VALUES cycle. (Check reviewPeriod/reviewCycle
  shape in prisma/seed.ts lines ~176-190 for how the app makes these.)
- Per present quarter: upsert Review (idempotent key: employeeId+cycleId+type QUARTERLY),
  status "COMPLETE", quarterlyScore = calculateQuarterlyScore(managerScores) [USE THE APP FN],
  ReviewRating rows both sides (side EMPLOYEE/MANAGER, item IMPACT/QUALITY/DELIVERY, score,
  comment) via prisma.reviewRating.upsert on @@unique([reviewId, side, item]). Narratives if
  present. Record an honest "IMPORTED" review event + audit (NOT impersonated submit/complete).
- Values (if any): ANNUAL_VALUES Review, 4 value ReviewRating rows (items = VALUES_ITEMS codes,
  which the extractor already emits as v.key), both sides.
- Idempotent: re-run skips/updates, never duplicates.
- Return ImportReport { periodLabel, files:[{file,status,employeeName,quartersImported?,
  valuesImported?,reasons?}], totals:{imported,quarantined} }.
KEY SHAPES CONFIRMED: calculateQuarterlyScore(scores)=round(mean,1dp) in review-workflow.ts:222.
ReviewRating: {reviewId, side(RaterSide), item(string), score(Int 1-5), comment?} unique
[reviewId,side,item]. QUARTERLY_ITEMS=["IMPACT","QUALITY","DELIVERY"]. VALUES_ITEMS as above.
Review completed state = status "COMPLETE" + quarterlyScore (see managerComplete).
Check the Review model for required fields (cycleId, type, employeeId, managerId, status,
quarterlyScore, okrContribution/developmentAction/employeeReflection narratives).

## STEP 5 — harness: scripts/stage8-migration-acceptance.ts
db:reset, then seed KNOWN Hub employees: Alice Tester, Bob Sample, Carol Messy (all with a
manager) — NOT Dave. Run importWorkbooks on scripts/synthetic-workbooks/ for period "2025".
Assert: alice imported, 4 quarters, officials 4.3/3.7/4.3/4.7, 4 values, status COMPLETE;
bob imported, 2 quarters (Q1-Q2); carol quarantined (bad rating); no_name quarantined; dave
quarantined (not in Hub). Re-run -> idempotent (no duplicates). Assert against EXPECTATIONS.json.
Then: operator runbook + PD entries (CLI, name-match+quarantine, manager-from-Hub,
recompute-not-import, honest-audit) + v0.9 sign-off.

## Open questions for the REAL run (not blocking synthetic build)
Roster source w/ emails; which year(s); how many workbooks; single vs multi-year files.

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -6 && git status --short && cat docs/RESUME_NEXT.md
