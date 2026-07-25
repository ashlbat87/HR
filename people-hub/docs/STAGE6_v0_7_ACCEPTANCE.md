# Release v0.7 (Stage 6) — HR Dashboard (Performance Operations Cockpit): Acceptance Record

Status: complete and verified. Awaiting Ash's formal sign-off.
Design note: docs/STAGE6_v0_7_DESIGN.md (approved, with refinements, before build).

## Purpose
An HR operations cockpit answering, within ~10 seconds: where are we in the current
process, where is it getting stuck, and what does HR need to do. It also consolidates
review administration: the dashboard and its drill-down now cover everything the old
Review Admin page did, which has been retired.

## Delivered
Data layer (src/modules/performance/dashboard-queries.ts), read-only, separate from
workflow mutations:
- getPeriodStatusSummary(periodId): per CYCLE (not just per type), so multiple quarterly
  cycles show separately. Stage-aware from the ACTUAL workflow: quarterly has 3 stages
  (self-review, manager, done); values and year-end have 4 (adding acknowledgement).
  Returns per-cycle completion and a factual bottleneck line (largest outstanding stage).
- getFilteredReviews({period,type,stage}): classifies in code using the same rules, so
  drill-down counts always match the dashboard.
- getEmployeesMissingManager / getEmployeesMissingGuide: setup-issue queries; the
  hierarchy root (a manager-less employee who has reports, e.g. the CEO) is excluded so
  every flag is actionable.

Dashboard (src/app/(app)/dashboard/page.tsx), HR-only:
- Active period banner + "Manage periods" link (period management stays at /periods).
- Current period health: per cycle, HR-facing label (the cycle's own label, e.g.
  "Q2 2026"), completion, stage-aware breakdown, and a bottleneck line.
- Needs Attention: review-process exceptions (not started, awaiting manager, awaiting
  acknowledgement) per cycle.
- Setup Issues: data-quality (missing manager, missing rating guide), visually separate
  from Needs Attention.
- Generic headcounts removed from the dashboard.
- Every actionable number links to its exact filtered list; a "Browse all reviews" link
  is also present.

Filtered browser (src/app/(app)/reviews-browse/page.tsx), HR-only:
- Reads period/type/cycle/stage filters and lists exactly those reviews; opening a review
  uses the same /reviews/[id] route, so the reopen-archived-year-end path is preserved.
- Data-quality views (dq=missing_manager | missing_guide) list the affected employees
  with a link to each profile.

Consolidation:
- Review Admin page retired; nav is now HR Dashboard / Browse reviews / Review periods.

## Metrics derived from the real workflow (confirmed in 6a)
Quarterly: no acknowledgement step (done = COMPLETE). Values: acknowledges but stays
COMPLETE (done = COMPLETE + acknowledgedAt set; awaiting-ack = COMPLETE + not
acknowledged). Year-end: archives on acknowledge (done = ARCHIVED).

## Parity checklist — Review Admin -> new home (verified before removal)
1. Generate reviews for open cycles -> /periods (per open cycle, "Generate reviews").
   PASS.
2. Browse all reviews across the org -> /reviews-browse with no filters; reachable via the
   "Browse reviews" nav link and the dashboard "Browse all reviews" link. PASS.
3. Open any review / reopen an archived year-end -> /reviews-browse row -> /reviews/[id]
   (same route as before, reopen path intact). PASS.
Only after all three passed was the Review Admin page and its nav link removed.

## Refinements honoured (from the approved design note)
Stage-aware per real workflow; "stuck" = accumulation by stage (no late/overdue language
pre-deadlines); Needs Attention and Setup Issues as separate sections; per-cycle
bottleneck line (derived, no AI); full parity-gated consolidation; period management kept
separate with a link; Manager Accountability View recorded in the backlog (v0.8+).

## Verification
- Regression: Stage 2 6/6, Stage 3 6/6, Stage 4 9/9, Stage 5 8/8 (all re-run after v0.7).
- 6a check (scripts/stage6a-check.ts): stage sums equal totals; filtered-list counts
  match summary counts on seed data; setup-issue counts correct (CEO excluded).
- Typecheck clean. Manual UI walk-through by Ash (dashboard, drill-down click-through,
  browse-all, parity of the three Review Admin capabilities).

## Known limitations / deliberate follow-ups (backlogged)
- No in-app way yet to fix a "missing rating guide" (or manager); assignment is via CSV
  import/seed. In-app employee editing (assign rating guide/manager, access-controlled
  and audited) is backlogged.
- Delete an opened-in-error (empty) cycle is backlogged (empty-only, audited,
  non-destructive).
- "Stuck" is accumulation by stage only; due-soon/overdue/locked/reopened await deadlines
  (v0.9). The dashboard is architected to add these without redesign.
- Manager Accountability View is backlogged for v0.8+ (with guardrails).
- v0.8 Insights/Moderation can consume the same query helpers without a redesign.

## Prototype release
Fictional data, mock auth. Not fit for real employee data until the production gate
(v0.10).

## Next
Release v0.8 — Reporting, Moderation & Calibration (and the Manager Accountability View).
