# Release v0.6 (Stage 5) — Review Cycle & Period Management: Acceptance Record

Status: complete and verified. Awaiting Ash's formal sign-off.
Design note: docs/STAGE5_v0_6_DESIGN.md (approved before implementation).

## Purpose
Lets the Hub run period over period. A review period is now a first-class entity. HR
defines a period, opens the cycles of each type within it, generates reviews for those
cycles, and completes a period (which archives it read-only) before starting the next.

## Delivered
Schema (additive, non-destructive):
- New ReviewPeriod entity { label, status (ACTIVE/COMPLETED), isCurrent, cycles,
  createdAt, closedAt } and PeriodStatus enum.
- ReviewCycle gains periodId (nullable) + period relation.

Workflow functions (HR-only, guarded, audited), in review-workflow.ts:
- createReviewPeriod(label): creates a period; becomes current only if none is current.
- setCurrentPeriod(id): moves the current flag; exactly one period current at a time.
- openCycleInPeriod(periodId, type, label): opens a cycle of the given type tied to the
  period; refused in a completed period; enforces per-type caps.
- completeReviewPeriod(id): blocked (with the outstanding list) while any review in the
  period is non-terminal; on success sets COMPLETED + closedAt and closes the cycles.

Business rule — per-type cycle caps within a period:
- Quarterly: max 4. Values Review: max 2 (allows a mid-year check-in). Year-end: max 1.
- Enforced in openCycleInPeriod (the core), so it holds for UI, seed, and tests.

HR UI (HR-guarded page at /periods, "Review periods" in the nav):
- Start a new period; list of periods (current highlighted, completed marked read-only).
- Per period: open a cycle of each type; generate reviews per open cycle (reuses the
  tested CreateCycleReviews); complete the period with a clear, grouped
  outstanding-reviews block when blocked (counts by type + status, not a per-review list).

Naming:
- "Annual values" relabelled to "Values Review" across the UI (display only; the
  ANNUAL_VALUES type code is unchanged everywhere). Reflects that values reviews are no
  longer strictly annual (mid-year check-in).

Seed:
- Creates a default current period "2026"; the seeded quarterly, values, and year-end
  cycles are attached to it.

## Decisions (per the approved design note)
1. A period is freely named (defaults to the calendar year).
2. Completing a period is blocked while any review is incomplete; HR is shown what is
   outstanding. No force-close, no silent discard (PDPL/SAMA: no data loss, defensible).
3. Multiple periods may exist; exactly one is current.
4. A completed period is read-only; a basic periods view ships now, rich historical
   browsing is deferred to the HR Dashboard (v0.7).
5. Scope boundary held: no dashboard/reporting in v0.6.
Also: cycle-type caps agreed (4 / 2 / 1); "Values Review" relabel (display only);
removal of the standalone Review admin page deferred to v0.7 (it is still the only
browse-all-reviews surface until the dashboard is built) — tracked in the backlog.

## Verification
- Stage 5 acceptance harness: 8/8 (period lifecycle, current-flag rules, cycle creation
  and periodId link, completed-period guard, completion block with outstanding list,
  successful completion archiving cycles, HR-only guard, and the cycle-type caps).
- Regressions: Stage 2 6/6, Stage 3 6/6, Stage 4 9/9.
- Harnesses are seed-independent and must be run one at a time, each after its own
  db:reset (they mutate the seed). Typecheck clean. Manual UI walk-through by Ash.

## Known limitations / follow-ups
- periodId remains nullable (avoids a destructive migration); tightening to required is
  a later hardening item.
- Cycle labels (e.g. "Q2 2026") remain free text; the period is the structural source
  of truth, the label is cosmetic.
- HR admin consolidation (build review status into the dashboard, absorb Review admin's
  browse-all, then remove the standalone Review admin page, and consider merging period
  management into one HR admin surface) is a v0.7 task — tracked in the backlog.
- Top-bar "Cycle: …" indicator does not yet reflect the current period.

## Prototype release
Fictional data, mock auth. Not fit for real employee data until the production gate
(v0.10).

## Next
Release v0.7 — HR Dashboard.
