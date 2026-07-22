# Release v0.6 (Stage 5) — Review Cycle & Period Management: Design Note

Status: design, approved for implementation.

## Purpose
Let the Hub run period over period. A review period becomes a first-class entity. HR
defines a period, opens the cycles of each type within it, completes a period (which
archives it read-only), and starts the next one. Today the period is only a text label
on each cycle; this gives it structure, grouping, and a lifecycle. A period is usually
a year (e.g. "2026") but is freely named.

## Decisions (agreed with Ash)
1. A period is freely named (label defaults to the calendar year, e.g. "2026", but HR
   may name it, e.g. a fiscal year).
2. Completing a period is BLOCKED if any cycle in it still has incomplete reviews; HR is
   told what is outstanding. No force-close, no silent discard (PDPL/SAMA: no data loss,
   defensible).
3. More than one period may exist at once; exactly one is "current" (the default a new
   cycle attaches to). Handles the real overlap where next period's Q1 opens before this
   period's year-end closes.
4. A completed period's cycles and reviews become read-only, viewable grouped under that
   period. v0.6 delivers the model, the management actions, and a BASIC periods
   list/view; rich historical browsing is deferred to the HR Dashboard (v0.7).
5. Scope boundary: v0.6 = period entity + cycles tied to periods + HR opening cycles of
   each type within the current period + completing a period (with the block rule) +
   starting a new period. NOT the full dashboard or reporting (v0.7+).

## Schema (additive, non-destructive)
New model:
  ReviewPeriod { id, label (String), status (PeriodStatus @default(ACTIVE)),
                 isCurrent (Boolean @default(false)), cycles (ReviewCycle[]),
                 createdAt, closedAt (DateTime?) }
New enum:
  PeriodStatus { ACTIVE, COMPLETED }
ReviewCycle gains:
  periodId (String?)  and  period (ReviewPeriod? relation)
  (Nullable initially so existing rows are valid; seed attaches all cycles to a default
  period. Kept nullable in v0.6 to avoid a destructive migration; a later hardening pass
  may tighten once all data is migrated.)

"Current period" rule: at most one ReviewPeriod has isCurrent = true. Starting a new
period sets the new one current and clears the flag on the previous current period (the
previous period continues to exist and its open cycles keep running until it is
completed).

## Behaviour / workflow (new functions, guarded, HR-only)
- createReviewPeriod(label): creates a period; first one (or when none current) becomes
  current. Guard: HR only.
- setCurrentPeriod(periodId): makes a period current, clears the previous. HR only.
- openCycleInPeriod(periodId, type, label, deadlines?): creates a ReviewCycle of the
  given type tied to the period and opens it. Reuses existing create/open cycle logic;
  the only new part is the periodId link. HR only.
- completeReviewPeriod(periodId): BLOCKED if any cycle in the period has any review not
  in a terminal state (COMPLETE / CLOSED / ARCHIVED). If blocked, returns the list of
  outstanding reviews. If clear, sets status = COMPLETED, closedAt = now, and closes the
  period's cycles (isOpen = false). Writes to the audit log. HR only.
- (Reads) listPeriods(), getPeriod(periodId) with its cycles for the basic view.

Existing per-cycle review creation (createQuarterlyReviewsForCycle, values, year-end)
is unchanged except that the cycle now carries a periodId; assembly/scoring logic is
untouched. Year-end assembly still reads the employee's quarterly/values reviews via the
existing employee-scoped lookups, so no change to scoring.

## Migration approach
Fictional prototype data only. No complex data migration: add the model and the nullable
periodId, then update the seed to (a) create a default current period "2026" and (b)
attach the seeded cycles to it. Existing labels like "Q2 2026" remain as the cycle label
for now (cosmetic); the structural period is the new source of truth.

## What could break, and how we guard it
- Anything querying cycles by their text label. We stop relying on the label for the
  period; the periodId is authoritative. We will grep for label-based period logic.
- Review creation flows. Unchanged bar the periodId link; the Stage 2/3/4 harnesses are
  the regression gate and must stay green after the schema change.
- Access control unchanged (period management is HR-only; review visibility rules are as
  before).

## Acceptance criteria (what a v0.6 harness will verify)
1. Create a period; it becomes current; only one period is current at a time.
2. Open a cycle of each type within a period; the cycle carries the correct periodId.
3. Starting a new period moves "current" and leaves the old period and its open cycles
   intact.
4. completeReviewPeriod is blocked while any review in the period is non-terminal, and
   returns the outstanding items.
5. completeReviewPeriod succeeds once all reviews are terminal: status COMPLETED,
   closedAt set, cycles closed, audit entry written.
6. A completed period's reviews are read-only (no further edits accepted).
7. Regression: Stage 2 6/6, Stage 3 6/6, Stage 4 9/9 still pass after the schema change.

## Staging (each behind a stop-and-approve gate)
- 5a: schema change (ReviewPeriod, PeriodStatus, cycle.periodId) + migrate/generate +
  seed attaches cycles to a default current period. Re-run all three harnesses (must
  stay green). Gate.
- 5b: period management functions (create / setCurrent / openCycleInPeriod /
  completeReviewPeriod) with a v0.6 acceptance harness. Gate.
- 5c: basic HR UI (periods list, start a period, open cycles within a period, complete a
  period with the outstanding-items block). Gate.
- 5d: closing docs (acceptance record, changelog, release history, approvals) and
  sign-off.

## Out of scope (deferred)
Rich historical browsing/reporting (v0.7 HR Dashboard); notifications/deadlines (v0.9);
real auth/hosting/residency (v0.10). Tightening periodId to non-null is a later
hardening item.
