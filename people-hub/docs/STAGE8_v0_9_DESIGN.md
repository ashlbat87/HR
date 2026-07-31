# Stage 8 / Release v0.9 — Historical Data Migration (DESIGN NOTE, approved)

Status: APPROVED by Ash (Head of People), 31 July 2026. Build may begin.

## 1. Purpose and scope
A one-off, controlled load of historic performance-review data into the Hub, from the filled
per-employee workbooks based on `2026_Performance_Review_MASTER.xlsx`.

In scope:
- Read many filled workbooks (one per employee), extract each quarter's ratings + comments +
  narratives and the annual Values Review, and create the matching Hub reviews.
- Match each workbook to an existing Hub employee; quarantine anything that does not match
  cleanly for Ash to resolve manually.
- Produce an auditable "imported / needs review" report.

Explicitly NOT in scope (separate items):
- Moderation/calibration (deferred post-V1, PD-029).
- Ongoing employee add/terminate (separate lifecycle feature, backlogged).
- The real-data run itself (happens only after the v0.10 production gate — hosting, residency,
  DPIA, named owner). v0.9 builds and PROVES the tool on synthetic data.

## 2. Operation model (decided)
A CLI script an operator runs against a folder of workbooks. Rationale: this is a one-off bulk
load; reviews are created natively in-app going forward. A controlled, operator-run,
report-producing script is less to build and more defensible for InfoSec/DPIA than an open
in-app upload screen. ("CLI for now, in-app later" if a recurring need ever appears.)

## 3. Source structure (confirmed from the master template)
Per workbook, sheets: `Q1 Review`, `Q2 Review`, `Q3 Review`, `Q4 Review`, `Values Review`,
five `Rating Guide — <dept>` tabs, `Rating Guide — Values`, `Year-End Summary`, `How To Use`.

Per quarterly sheet — header identity in column C beside labels in column B:
- Name C4, Role C5, Department C6, Manager C7.

Per quarterly sheet — criterion rows differ BY QUARTER (verified):
- Q1: IMPACT row 19, QUALITY row 23, DELIVERY row 27.
- Q2/Q3/Q4: IMPACT row 20, QUALITY row 24, DELIVERY row 28.
- In each criterion row: Manager Rating = col C, Manager Comments = col D,
  Employee Self-Rating = col E, Employee Comments = col F.
- Quarterly score is an auto-average cell (Q1 G31, Q2-Q4 G37) — we DO NOT import it; the Hub
  recomputes the official score from the manager ratings (single source of truth).
- Narratives: manager summary, development action, employee reflection (rows below the score;
  confirmed per sheet at build time).

**Design principle from this:** anchors are NOT globally constant (they already shift between
Q1 and Q2-Q4). The extractor keys off each sheet's detected layout (locate the criterion label
rows, then read the fixed offsets), and VALIDATES rather than assumes. Any sheet that does not
match the expected shape is quarantined, never guessed.

Values Review: each value rated 1-5 (manager + employee), overall values rating auto-averaged
(recomputed, not imported). Maps to an ANNUAL_VALUES review.

Year-End Summary: auto-calculated from the four quarters. NOT imported — the Hub derives the
year-end result itself (PD-002/003: derived, never stored as an imported figure).

## 4. Identity matching — the main risk
The Hub keys employees on `workEmail` (unique). The workbook header has Name / Role /
Department / Manager but no email. So matching is NAME-based, which is fuzzy (duplicate
names, spelling/spacing variants, "Bob" vs "Robert").

Mitigations:
- Match workbook Name against Hub displayName, normalised (trim, case-fold, collapse spaces).
  Manager name matched the same way to link the reviewer.
- Exact normalised match -> proceed. Anything else (no match, multiple matches, ambiguous) ->
  QUARANTINE with the reason; Ash resolves manually (e.g. by providing a name->email mapping
  file the script consumes on the next run).
- No auto-create of employees from a workbook (per decision). If an employee is missing, that
  is a roster gap Ash resolves first.
- Recommended: before phase 2, seed/confirm the employee roster (phase 1) so every workbook
  has a real employee to attach to.

## 5. Mapping to the model
Per matched employee, per quarter with data:
- One `Review` (type QUARTERLY) in the appropriate cycle/period.
- `ReviewRating` rows for Impact/Quality/Delivery, manager side and employee side, with scores
  and comments.
- Manager score is the official score (PD-001/002). Quarterly + year-end figures are RECOMPUTED
  by the Hub, not imported.
Values Review -> one ANNUAL_VALUES `Review` with per-value manager + employee ratings.

Target period/cycle: the historic year (e.g. "2025"). The script creates or reuses the period
and the four quarterly cycles + values cycle, matching how the app models a year.

## 6. Validation-first (never silently wrong)
Every file and field validated before anything is written:
- Sheet names present and recognised; header fields present.
- Ratings are integers 1-5 (reject "4 - Advanced", blanks where a rating is required, text).
- Employee (and manager) resolve to exactly one Hub employee.
- A quarter with no manager ratings is treated as "not reviewed", skipped, not a zero.
Any failure -> that review (or that whole file) is QUARANTINED with a clear reason. Output is a
report: imported OK, skipped (empty), and needs-review (with reasons), per file.

## 7. Idempotent + audited
- Re-running does not duplicate: a review is keyed by (employee, period, cycle-type/quarter);
  existing -> skip or update, never duplicate.
- Every action logged: source filename, what was created/updated, when, by whom (operator).
- No overwrite of anything a user later edits in-app without an explicit flag.

## 8. Build + prove on SYNTHETIC data first
- Build a synthetic-workbook generator that produces filled copies of the template with fake
  names/ratings/comments (including deliberately messy ones: shifted rows, text-in-rating,
  blanks, unknown employee) to exercise validation + quarantine.
- An acceptance harness asserts: clean files import with correct scores; messy files quarantine
  with the right reasons; re-run is idempotent; year-end/quarterly figures are recomputed.
- NO real employee data used anywhere in v0.9. Real data only after the v0.10 gate.

## 9. Deliverables
1. `scripts/migrate-history.ts` — the CLI migration (folder in -> import + report out).
2. `scripts/generate-synthetic-workbooks.ts` — fake filled workbooks for testing.
3. `scripts/stage8-migration-acceptance.ts` — the acceptance harness.
4. A short operator runbook (how to run, how to read the report, how to resolve quarantines).
5. PD entries for the key decisions (CLI, name-matching + quarantine, recompute-not-import).

## 10. Open questions (resolve before/at build)
- Roster source for phase 1 (clean export with emails, or seed from workbook names + a
  name->email map).
- Which historic year(s) are being loaded, and roughly how many workbooks.
- One file per employee for a single year, or multi-year files.
