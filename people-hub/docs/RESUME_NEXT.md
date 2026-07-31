# Resume Next — v0.9 Historical Data Migration (BUILD)

Design APPROVED and committed: docs/STAGE8_v0_9_DESIGN.md. Now building the migration tooling,
all TypeScript, proven on SYNTHETIC data (no real data before the v0.10 production gate).
Standard setup if restarted: `npm run typecheck`, `npm run db:reset`. Do NOT upgrade Prisma.

## Decisions locked (v0.9)
- One-off CLI migration (TypeScript/tsx, reuses Prisma + app review-creation logic).
- Reads filled per-employee workbooks (one file per employee) matching the MASTER template.
- Identity: match workbook NAME -> Hub displayName (normalised). No email in the workbook, so
  matching is name-based; anything ambiguous/unmatched is QUARANTINED for Ash (no auto-create).
- Recompute-not-import: quarterly + year-end scores are recomputed by the Hub from manager
  ratings, never imported from the sheet's cached formulas.
- Validation-first: every file/field validated (ratings 1-5 int, sheet/header present); any
  failure quarantined with a reason; output an imported/skipped/needs-review report.
- Idempotent (keyed by employee+period+quarter) and audited.
- SheetJS (`xlsx` 0.18.5) installed as dev dep for reading workbooks.

## Anchors (verified from template — Q1 differs from Q2-Q4!)
Header: Name C4, Role C5, Dept C6, Manager C7 (every quarter sheet).
Criterion DATA rows: Q1 impact19/quality23/delivery27; Q2-Q4 impact20/quality24/delivery28.
Cols in each criterion row: mgr rating C, mgr comment D, self rating E, self comment F.
Values Review + Year-End exist; year-end is DERIVED (recomputed), not imported.

## Build sequence (each verified before the next)
1. `scripts/lib/review-template-anchors.ts` — shared anchor constants (generator + extractor
   both import; single source of truth so they can't drift). PROVEN in sandbox.
2. `scripts/generate-synthetic-workbooks.ts` — builds fake filled workbooks in code (no binary
   template): clean Alice (known ratings), partial Bob (Q1-Q2 only), + 3 quarantine cases
   (text-in-rating Carol, no-name, unknown-employee Dave) + EXPECTATIONS manifest. Outputs to
   a gitignored scripts/synthetic-workbooks/. PROVEN in sandbox with SheetJS.
3. `scripts/lib/extract-workbook.ts` — read one workbook, locate/validate each sheet, return a
   clean structured result OR quarantine reasons. Assert exact values against Alice's knowns.
4. `scripts/migrate-history.ts` — match to Hub employees by normalised displayName, create
   reviews idempotently via Prisma (QUARTERLY + ANNUAL_VALUES), audit log, report.
5. `scripts/stage8-migration-acceptance.ts` — seed known Hub employees (Alice/Bob/Carol, NOT
   Dave); assert clean import + correct recomputed scores; messy files quarantine with right
   reasons; re-run idempotent.
Then: operator runbook + PD entries (CLI, name-match+quarantine, recompute-not-import) + sign-off.

## Open questions for the REAL run (not blocking synthetic build)
- Roster source for phase 1 (clean export w/ emails, or name->email map).
- Which historic year(s); how many workbooks; single-year vs multi-year files.

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -6 && git status --short && cat docs/RESUME_NEXT.md
