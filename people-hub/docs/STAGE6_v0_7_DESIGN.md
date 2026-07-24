# Release v0.7 (Stage 6) — HR Dashboard (Performance Operations Cockpit): Design Note

Status: APPROVED (Ash, 22 July 2026), with refinements folded in. Build in staged gates 6a-6e.

## Approved refinements (Ash)
These decisions refine the sections below and take precedence where they differ.
1. Stage-aware per ACTUAL workflow: show only the stages that genuinely exist in each
   review type's approved workflow; never render a stage a type does not have. Confirm
   the real stages per type during 6a and derive metrics from them (esp. whether
   quarterly has an acknowledgement step).
2. "Stuck" = accumulation by stage (not started, in progress, awaiting manager, awaiting
   acknowledgement). No "late/overdue/behind" language until deadlines (v0.9). Architect
   so v0.9 can add due-soon / overdue / locked / reopened without redesign.
3. TWO separate sections, both actionable and clickable to the exact filtered list:
   - NEEDS ATTENTION: review-process exceptions (not started, awaiting manager, awaiting
     acknowledgement, returned/reopened where relevant).
   - SETUP ISSUES: configuration/data-quality (missing manager, missing rating guide,
     future setup blockers). The split makes it immediately clear whether HR faces a
     process bottleneck or a data/config issue.
4. Manager Accountability View recorded in the backlog NOW; not built in v0.7.
5. Per review type, a simple DERIVED bottleneck line from the stage counts (e.g. "Main
   bottleneck: 4 reviews awaiting manager action"). No AI, no subjective interpretation.
6. Full consolidation, parity-gated: retire Review Admin only after the parity checklist
   passes.
7. Period management stays separate at /periods; dashboard shows the active period and a
   prominent "Manage periods" action; no embedding.

## 1. Purpose and user outcomes
An operational decision-making workspace, not a KPI wall. Within ~10 seconds HR can
answer: where are we in the current process, where is it getting stuck, what do I need to
do. Outcomes: see the active period and its review types in HR-facing terms; see
stage-aware completion at a glance; jump from any number to the exact reviews behind it;
perform every Review Admin task from here so the standalone page can be retired.

## 2. Information architecture (progressive disclosure)
Level 1 Current Cycle Health (overview of the active period). Level 2 Needs Attention
(process exceptions) and Setup Issues (data/config), both actionable. Level 3 drill-down:
Period -> review type -> status -> employee/review (replaces Review Admin).

## 3. Sections in priority order
1. Active period banner: current period + status + "Manage periods" (HR only); empty
   state if no current period.
2. Current Cycle Health: per open review type in the current period, stage-aware
   completion in HR-facing labels (Q1/Q2 Review, Values Review, Year-End Review), plus a
   derived bottleneck line.
3. Needs Attention: process exceptions (not started, awaiting manager, awaiting
   acknowledgement, returned/reopened), each clickable to the filtered list.
4. Setup Issues: data-quality (missing manager, missing rating guide), each clickable.
5. Browse reviews (Level 3 entry): the drill-down replacing Review Admin.

## 4. Metrics and definitions (scoped to current period)
Stage mapping, shown only where the review type has that stage:
- Self-review outstanding: NOT_STARTED or IN_PROGRESS.
- Awaiting manager: SUBMITTED or AWAITING_MANAGER (+ REOPENED manager-side).
- Awaiting acknowledgement: COMPLETE and not acknowledged (types with an ack step only).
- Done: acknowledged (year-end also ARCHIVED).
Overall completion (per type) = done / total of that type in the period.
Setup: missing manager = active employee, no managerId; missing rating guide = active
employee, ratingGuideCategory null.
Bottleneck line: the stage with the largest outstanding count, stated factually.
Actual stages per review type to be confirmed from the workflow during 6a.

## 5. Drill-down behaviour
Every number links to a filtered review list. Filters: period, review type, status (or
group), and the data-quality filters. From a list, open any review and reach the
reopen-archived-year-end path. Path: Period -> type -> status -> employee/review.

## 6. Review Admin consolidation / migration
Full consolidation, gated on parity. Build browse/drill-down to cover everything Review
Admin does (generate reviews already on /periods, browse all, filter, open any review,
reopen archived year-end). Parity checklist is an explicit acceptance criterion; only
after it passes do we remove the Review Admin page and its nav link.

## 7. Period management integration
Stays separate at /periods (setup). Dashboard shows the active period + status and a
prominent "Manage periods" link. The full interface is not embedded.

## 8. Roles and permissions
HR/HR Admin only, guarded server-side (redirect non-HR), as now. Drill-down and opening
reviews reuse existing access rules and workflow guards. No new permission surface.

## 9. Empty states and edge cases
No current period -> banner prompts to create/set one; health shows a friendly empty
state. Period with no open cycles -> "no review types open yet". Open cycle with no
reviews -> "0 reviews, generate them". Zero outstanding in a stage -> positive state.
Setup issues at zero -> quiet "no issues" so HR knows it was checked. Each review type
reports its own stages independently.

## 10. Out of scope for v0.7
Rating distributions/analytics; moderation; calibration; Manager Accountability View
(backlog, v0.8+); notifications/reminders/deadlines and any "overdue/late" measure
(v0.9); embedding period management; generic workforce headcounts (Directory); any AI
interpretation.

## 11. Architecture prep for v0.8 (not built now)
Compute metrics via small named server-side helpers (period-status summariser,
filtered-reviews query) so an Insights/Moderation layer can consume the same data later.
Keep the filter model general (period, type, status, employee, manager). Ensure per-review
and per-manager data is reachable via drill-down so the Manager Accountability View can be
built on it. Treat the dashboard as a layout of sections so a future Insights section is a
peer addition.

## 12. Acceptance criteria
1. HR-only; non-HR redirected.
2. Active period shown with status + working "Manage periods"; no-period empty state works.
3. Current Cycle Health: per open type, overall completion + stage-aware breakdown
   (only real stages) in HR-facing labels + a derived bottleneck line.
4. Needs Attention (process) and Setup Issues (data-quality) are separate, both actionable.
5. Every number links to a filtered list of exactly the reviews/employees behind it.
6. From a list, open any review and reach the reopen-archived-year-end path.
7. Parity checklist passes (every Review Admin task doable via dashboard/drill-down) BEFORE
   removal.
8. After parity, Review Admin page + nav removed.
9. No generic headcounts on the dashboard; data-quality retained under Setup Issues.
10. Empty/edge states render sensibly.
11. Regressions: Stage 2 6/6, Stage 3 6/6, Stage 4 9/9, Stage 5 8/8 still pass.
12. Typecheck clean; established design system used.

## 13. Manager Accountability View — backlog confirmation
Recorded now (see docs/FEATURE_BACKLOG.md, docs/PRODUCT_ROADMAP.md, project journal, v0.8
design considerations). Operational/accountability only; no manager quality score; no
league table; context/trends not punitive labels; any AI advisory and human-reviewed. Not
built in v0.7; v0.7 data/drill-down must not block it.

## Staging (gates)
6a query helpers (+ confirm real stages per type, checks). 6b dashboard sections (health,
needs attention, setup issues, empty states). 6c filtered drill-down (click-through to
reviews + reopen). 6d parity checklist, then retire Review Admin + nav. 6e docs + sign-off.
