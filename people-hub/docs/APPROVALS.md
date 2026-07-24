
## Stage 2 (quarterly review workflow) — Version 0.2

- **Status:** Approved as the prototype baseline, CONDITIONAL.
- **Approved by:** Ash (Head of People).
- **Date:** 14 July 2026.
- **Scope approved:** Quarterly review creation, employee workflow, manager
  workflow, draft saving, status tracking, quarterly score calculation, OKR
  contribution, development action, employee reflection, and the user-facing
  Audit Timeline. Excludes Annual Values, Year-End, reporting, dashboards.
- **Condition of approval:** Completion of the recommended manual UI spot-check
  of the Stage 1 screens (sign-in, directory, profile, team, import) to confirm
  no visual regression. OUTSTANDING at time of approval.
- **Verification:** All six Section 4 acceptance tests passed under automated
  execution against the real database (scripts/stage2-acceptance.ts). Core
  workflow also confirmed live during the build. See the Stage 2 Test Report and
  Acceptance Record.
- **Defects found and resolved during Stage 2:** vanishing Postgres (fixed via
  devcontainer), two pre-existing Stage 1 async params/searchParams type errors
  (directory fixed; profile fixed in the 0.2 tidy-up), and the client-side
  save-then-submit race (fixed with atomic server actions).
- **Carried-forward limitations (unchanged):** import commit not transaction-
  wrapped; prototype only, mock auth, not fit for real data.

---

## Stage 3 (Annual Values Review) — Planning Approved

- **Status:** Planning approved. Implementation authorised to begin, limited to the
  Annual Values Review only.
- **Approved by:** Ash (Head of People).
- **Date:** 14 July 2026.
- **Approved documents:** Product Roadmap v1.0; Stage 3 Technical Plan.
- **Architecture decision (accepted):** generalise the shared quarterly workflow and
  form to serve both review types, rather than duplicate. The Stage 2 acceptance
  harness is a mandatory regression gate before Stage 3 is accepted.
- **Acknowledgement (accepted default):** the employee acknowledges having seen the
  completed review (a read sign-off, not agreement).
- **Other accepted defaults:** per-value comments optional; one HR-created
  ANNUAL_VALUES cycle per year; anchors shown on the values form (quarterly-form
  anchors remain a separate future enhancement); reopen/close/return per the plan's
  permission matrix.
- **Scope authorised:** Annual Values Review only. No Stage 4 work.
- **Exit:** per the Stage 3 Technical Plan's release exit criteria; approval to be
  sought again on completion, with screenshots and a testing checklist.

---

## Stage 3 (Annual Values Review) — COMPLETE and ACCEPTED

- **Status:** Complete and accepted.
- **Approved by:** Ash (Head of People).
- **Date:** 15 July 2026.
- **Verification:** Stage 3 acceptance harness 6/6; Stage 2 regression 6/6;
  typecheck clean; full manual walk-through completed (see Stage 3 Testing Checklist).
- **Delivered:** two-sided values workflow, four Tarabut values with inline anchors,
  manager-only overall values score kept separate from performance, draft/return/
  reopen/close, rating-difference highlighting, timeline + audit, electronic
  acknowledgement, employee sees manager assessment when complete, server-side
  permissions.
- **Not included (deliberately):** review deadline locking (approved separately as a
  future feature, scheduled with Notifications & Reminders v0.8); quarterly
  consistency change (show manager assessment on completed quarterly reviews) —
  queued as a small follow-up.
- **Prototype release:** fictional data, mock auth. No real data.

---

## Stage 4 / Release v0.5 (Year-End Summary) — COMPLETE and ACCEPTED

- **Status:** Complete and accepted.
- **Approved by:** Ash (Head of People).
- **Date:** 22 July 2026.
- **Verification:** Stage 4 acceptance harness 9/9; Stage 3 regression 6/6; Stage 2
  regression 6/6; typecheck clean; manual walk-through across employee, manager, and
  archived states. Harnesses since made seed-independent and re-run green.
- **Delivered:** per-employee YEAR_END review assembling the year's quarterly and
  values results; quarter-by-quarter journey; Annual Performance Score (mean of
  completed quarters, numeric only, N-of-4 basis); the two year-end scores side by
  side, never blended; four narrative fields; electronic acknowledgement to a
  read-only ARCHIVED state with HR-only reopen; flagship conversation-guided screen.
  Also: CEO and full reporting hierarchy; restructured reviews list.
- **Decisions (approved):** mandatory narrative (employee self-assessment; manager
  assessment + development plan; areas for growth optional); values complete before
  year-end completion; one HR-created YEAR_END review per annual cycle; annual score
  numeric only, no label stored (labels a future policy decision).
- **Schema (additive):** Review gains annualPerformanceScore and four narrative fields;
  ReviewStatus gains ARCHIVED; ReviewEventType gains ARCHIVED.
- **Prototype release:** fictional data, mock auth. No real data.

---

## Stage 5 (design) / Release v0.5.1 (Review Experience & Rating Design System) — COMPLETE and ACCEPTED

- **Status:** Complete and accepted. Point release on top of v0.5.
- **Approved by:** Ash (Head of People).
- **Date:** 22 July 2026.
- **Verification:** Stage 2 acceptance 6/6; Stage 3 acceptance 6/6; Stage 4 acceptance
  9/9 — all re-run after the review-form restructuring and refactored to be
  seed-independent (workflow subject Petra Novak; strangers pinned to unrelated
  employees). Typecheck clean. Full record: docs/STAGE5_v0_5_1_ACCEPTANCE.md.
- **Delivered:** Annual Values premium redesign (icons, real anchors, definitions,
  official labels); real seeded rating-guide content (VALUES guide + five department
  PERFORMANCE guides, 75 anchors); rating identity design system (EmployeeRatingCard,
  ManagerRatingCard, RatingComparison) documented in docs/DESIGN_SYSTEM_ratings.md;
  grouped "Your rating"/"Employee rating" unit applied consistently across quarterly
  and values; quarterly criterion definitions and department-aware anchors; standalone
  HR Review administration screen; My Reviews categorisation fix; seed populates real
  completed reviews.
- **Decisions (approved):** point release (no roadmap renumber); employee selection
  light purple, manager the bold-purple card with comment folded in; scoring buttons
  stay light-selected; definitions hardcoded (shared), anchors seeded (department-
  specific); reset satisfied by reopen, no data-wipe (PDPL/SAMA retention).
- **Not included (deliberately):** "How performance works" employee guide (backlog);
  year-end excluded from the scoring-button pattern by design; annual-score descriptive
  label a future policy decision.
- **Prototype release:** fictional data, mock auth. No real data.

## Stage 5 / Release v0.6 (Review Cycle & Period Management) — COMPLETE and ACCEPTED

- **Status:** Complete and accepted.
- **Approved by:** Ash (Head of People).
- **Date:** 22 July 2026.
- **Design note approved before build:** docs/STAGE5_v0_6_DESIGN.md.
- **Verification:** Stage 5 acceptance harness 8/8 (period lifecycle, current-flag
  rules, cycle creation + periodId, completed-period guard, completion block with
  outstanding list, successful completion archiving cycles, HR-only guard, cycle-type
  caps). Regressions: Stage 2 6/6, Stage 3 6/6, Stage 4 9/9. Typecheck clean. Manual UI
  walk-through by Ash. Full record: docs/STAGE5_v0_6_ACCEPTANCE.md.
- **Delivered:** ReviewPeriod entity + PeriodStatus + cycle.periodId (additive schema);
  HR-only functions createReviewPeriod / setCurrentPeriod / openCycleInPeriod /
  completeReviewPeriod (guarded, audited); per-type cycle caps (4 quarterly, 2 Values
  Review, 1 year-end); HR "Review periods" page (start period, set current, open cycles,
  generate reviews per cycle, complete period with a grouped outstanding-reviews block);
  "Annual values" relabelled to "Values Review" (display only); seed creates a default
  current period "2026".
- **Decisions (approved):** freely-named period (defaults to calendar year); completion
  blocked while any review incomplete (no force-close, no data-wipe — PDPL/SAMA);
  multiple periods with exactly one current; completed period read-only with a basic
  view now and rich history deferred to v0.7; cycle-type caps 4/2/1.
- **Deferred:** HR admin consolidation and removal of the standalone Review admin page
  to v0.7 (dashboard must first provide review status / browse-all); periodId tightening
  to a later hardening pass. Tracked in docs/FEATURE_BACKLOG.md.
- **Prototype release:** fictional data, mock auth. No real data before the production
  gate (v0.10).
