# Resume Next — v0.9 Historical Data Migration (FINISH: runbook + PD + sign-off)

Migration is BUILT and PROVEN. All 5 build steps done + committed. Harness 22/22.
What remains: operator runbook, PD entries, v0.9 sign-off (needs Ash's explicit approval).
Setup if restarted: `npm run typecheck`, `npm run db:reset`. Do NOT upgrade Prisma.

## Done + committed (all 5 steps)
- scripts/lib/review-template-anchors.ts — shared anchors (Q1 19/23/27, Q2-Q4 20/24/28;
  header C4-C7; values rows 7-10 cols D/E with app VALUES_ITEMS codes; normaliseName).
- scripts/generate-synthetic-workbooks.ts — 5 fixtures + EXPECTATIONS.json (gitignored output).
- scripts/lib/extract-workbook.ts — PURE extractor+validator (whole-file quarantine on bad
  rating; absent quarter skipped). Verified.
- scripts/migrate-history.ts — importer. importWorkbooks(dir,{periodLabel,actorEmail}). Option
  B: direct-to-COMPLETE, honest "IMPORTED" audit. Name-match -> quarantine on doubt. Manager
  from Hub. Find-or-create historic period (isCurrent:false) + cycles. App's
  calculateQuarterlyScore + reviewRating shape. Idempotent. CLI: npx tsx scripts/migrate-history.ts <folder> <year>
- scripts/stage8-migration-acceptance.ts — 22/22. Run: db:reset then
  `npx tsx scripts/stage8-migration-acceptance.ts` (seeds its own known state, standalone).

## STEP — finish v0.9
1. Operator runbook (docs/): how to run the CLI, read the report (imported/quarantined +
   reasons), resolve quarantines (fix workbook or roster, re-run — it's idempotent). For the
   real run: operator + approved environment only, AFTER the v0.10 gate.
2. PD entries (docs/PRODUCT_DECISIONS.md, next is PD-030): CLI one-off; name-match +
   quarantine-on-doubt (no auto-create); manager taken from Hub (not workbook); recompute-not-
   import (scores via app fn); Option B honest-audit (no impersonation); historic period never
   set current; whole-file quarantine on any bad value.
3. v0.9 SIGN-OFF: run full regression (stage8 22/22 + stage7a/criterion/7d/gap-direction +
   stage2/stage5), append APPROVALS.md entry (match v0.8 format), roadmap/release-history v0.9
   -> Complete. ONLY record after Ash explicitly approves.

## Open questions for the REAL run (not blocking sign-off of the synthetic build)
- Roster source with emails (name->email map bridges the workbook's name-only identity).
- Which historic year(s); how many workbooks; single-year vs multi-year files.

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -6 && git status --short && cat docs/RESUME_NEXT.md
