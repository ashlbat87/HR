# Historical Data Migration — Operator Runbook (v0.9)

## What this is
A one-off tool to load historic performance reviews into the People Hub from the filled
per-employee review workbooks (the 2026 Performance Review template employees completed). It
reads a folder of workbooks, matches each to a Hub employee, and creates the corresponding
completed reviews. Built and proven on synthetic data (acceptance harness 22/22). Going
forward, reviews are created natively in the app — this tool exists only for the initial
history load.

## HARD RULE — no real data before the production gate (v0.10)
This tool must NOT be run against real employee data until ALL of the following are in place
and signed off (the v0.10 production gate):
- Real authentication (not the prototype mock auth).
- Approved hosting with data residency confirmed for KSA, UAE, and Bahrain (PDPL, SAMA,
  CBUAE, CBB).
- A completed and signed DPIA (data protection impact assessment).
- Named owner(s) and IT/InfoSec approval.
The real run happens only in the approved environment, executed by a named operator. Until
then, the tool is exercised on SYNTHETIC data only.

## Prerequisites for the real run
1. The current employee roster is loaded in the Hub, each with their work email (the Hub
   matches people by work email as their unique identity).
2. A name-to-email reconciliation is prepared: the workbooks identify people by NAME only, but
   the Hub matches on displayName. Confirm workbook names match Hub display names, or prepare a
   mapping to resolve differences before running.
3. Every employee who has historic reviews has a manager set in the Hub (the review's manager
   is taken from the Hub record, not the workbook).
4. The filled workbooks are collected in a single folder, one file per employee.
5. You are running in the approved environment (see the hard rule above).

## How to run
Command form (run from the people-hub directory):

    npx tsx scripts/migrate-history.ts <folder> <year>

- folder: path to the folder of filled workbooks, e.g. ./history-2025
- year: the historic period label to load into, e.g. 2025. The tool find-or-creates this
  period and its four quarterly cycles (Q1 2025 .. Q4 2025) plus a values cycle (Values 2025).
  The historic period is NEVER set as the current period.

Example:

    npx tsx scripts/migrate-history.ts ./history-2025 2025

## How to read the report
The run prints one line per file, then totals. Example:

    === Historical migration — period 2025 ===
      OK         alice.xlsx — Alice Tester — quarters [Q1, Q2, Q3, Q4] + values
      OK         bob.xlsx — Bob Sample — quarters [Q1, Q2]
      QUARANTINE carol.xlsx — Carol Messy — invalid rating at Q3 Review impact manager
      QUARANTINE dave.xlsx — Dave Unknown — employee not found in Hub

    Totals: 2 imported, 3 quarantined.

- OK: the file was imported. The quarters listed had manager ratings; "+ values" means a
  values review was imported too. Empty quarters (person not reviewed that quarter) are simply
  not listed — that is normal, not an error.
- QUARANTINE: nothing from that file was imported; it needs a human decision. The reason is
  shown. Quarantine is whole-file: if anything in a workbook is invalid, the entire file is
  held (all-or-nothing per person) so no partial or wrong record is created.

## Resolving quarantines
Fix the underlying cause, then re-run the tool — it is idempotent, so already-imported files
are not duplicated and only the newly-fixed files import.

- "employee not found in Hub": the workbook name does not match any Hub displayName. Either
  the person is not in the roster (add them, with their manager), or the name differs (correct
  the workbook name or the roster to match).
- "ambiguous name match": more than one Hub employee shares that name. Disambiguate in the
  roster before re-running.
- "employee has no manager in Hub": set the person's manager in the Hub, then re-run.
- "missing employee name": the workbook has no name in the header (Q1 cell C4). Add it.
- "invalid rating at ...": a rating cell contains something other than a whole number 1-5
  (e.g. text like "4 - Advanced", or a blank where a rating was expected). Correct the cell in
  the workbook, then re-run.

## What it creates
- One completed (COMPLETE) quarterly review per quarter that had manager ratings, with the
  three criterion ratings (Impact, Quality, Delivery) for both the manager and the employee.
- The quarterly score is recomputed from the manager ratings by the app's own calculation —
  the spreadsheet's cached score is never imported.
- One completed values review if the workbook's Values sheet was filled, with the four value
  ratings for both sides and a recomputed values score.
- Performance and values scores are stored separately and never blended.
- Each imported review records an honest audit entry (action review.import_historic) noting
  the source file. The tool does not impersonate employees or managers.

## Safety properties
- Idempotent: safe to re-run; existing reviews are updated in place, never duplicated.
- Quarantine-on-doubt: any invalid value or unresolved identity holds the whole file rather
  than importing a partial or wrong record.
- Recompute-not-import: all scores are derived by the app, so migrated data is identical in
  shape and calculation to natively-created reviews.
- The historic period is never made current, so loading history does not disturb the live
  current period.
