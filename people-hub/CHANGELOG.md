## [0.6] — Stage 5 / Release v0.6: Review Cycle & Period Management (COMPLETE)
A review period becomes a first-class entity, letting the Hub run period over period.
Full record: docs/STAGE5_v0_6_ACCEPTANCE.md. Design: docs/STAGE5_v0_6_DESIGN.md.
### Added
- ReviewPeriod entity (label, status, isCurrent, closedAt) + PeriodStatus enum; ReviewCycle gains periodId.
- HR-only period functions: createReviewPeriod, setCurrentPeriod, openCycleInPeriod, completeReviewPeriod (guarded, audited).
- Per-type cycle caps within a period: 4 quarterly, 2 Values Review (allows a mid-year check-in), 1 year-end; enforced in openCycleInPeriod.
- HR "Review periods" page: start a period, set current, open cycles of each type, generate reviews per cycle, and complete a period.
- Completing a period is blocked while any review is incomplete, showing a grouped outstanding-reviews summary (by type + status).
- Seed creates a default current period "2026" and attaches the seeded cycles to it.
### Changed
- "Annual values" relabelled to "Values Review" across the UI (display only; ANNUAL_VALUES type code unchanged).
### Verification
- Stage 5 acceptance 8/8 (incl. cycle-type caps); regressions Stage 2 6/6, Stage 3 6/6, Stage 4 9/9; typecheck clean; manual UI walk-through. Prototype release; fictional data only.
### Deferred
- HR admin consolidation and removal of the standalone Review admin page → v0.7 (dashboard must first provide review status / browse-all). periodId tightening → later hardening.
## [0.5.1] — Review Experience & Rating Design System (COMPLETE)
Point release on top of v0.5. Refines the review experience and introduces the rating
design system across the existing review features. Full record: docs/STAGE5_v0_5_1_ACCEPTANCE.md.
### Added
- Annual Values premium redesign: value icons, real behavioural anchors and criterion definitions, official rating labels.
- Real seeded rating-guide content: the VALUES guide plus five department PERFORMANCE guides (75 department-specific anchors from the master spreadsheet).
- Rating identity design system (EmployeeRatingCard, ManagerRatingCard, RatingComparison) with optional comments; documented in docs/DESIGN_SYSTEM_ratings.md.
- Grouped "Your rating" / "Employee rating" unit applied consistently on the quarterly and values forms.
- Quarterly form: shared criterion definitions (Impact, Quality, Delivery) plus the selected level's real department anchor, department-aware.
- Standalone HR Review administration screen; personal reviews page made personal-only.
- Seed drives one employee's quarterly and values reviews to COMPLETE with realistic ratings and comments.
### Fixed
- My Reviews categorisation: personal and team reviews no longer conflated.
### Decisions
- Point release (no roadmap renumber). Employee selection light purple; manager rating bold-purple card with comment folded in. Buttons stay light-selected. Definitions hardcoded (shared); anchors seeded (department-specific). Reset = reopen; no data-wipe.
### Verification
- Stage 2 6/6; Stage 3 6/6; Stage 4 9/9 (all re-run post-restructure, now seed-independent); typecheck clean. Prototype release; fictional data only.
### Deferred
- "How performance works" employee guide (backlog); year-end excluded from the scoring-button pattern by design; annual-score label a future policy decision.
## [0.5] — Stage 4 / Release v0.5: Year-End Summary (COMPLETE)

Year-End Summary delivered and verified. A per-employee YEAR_END review assembles the
year's quarterly and values results and adds the year-end narrative and outcome, per
the Excel master template.

Delivered: quarter-by-quarter journey; Annual Performance Score (mean of completed
quarterly Q Scores, numeric only, "N of 4" basis, handling 1 to 4 quarters); the two
year-end scores side by side (performance and values), never blended; four dedicated
narrative fields (employee self-assessment, manager assessment, areas for growth,
development plan); electronic acknowledgement moving the review to a read-only ARCHIVED
state with HR-only reopen; and a flagship conversation-guided screen with a
state-dependent voice and confident purple-to-teal branding.

Also delivered: a CEO and full reporting hierarchy (every employee except the CEO now
has a manager and receives reviews, closing a gap where department leads received
none), and a restructured reviews list page (personal reviews first, then a separate
HR administration section for generating and browsing all reviews).

Decisions (approved): mandatory narrative (employee self-assessment; manager assessment
+ development plan; areas for growth optional); values review must be complete before
year-end completion; four dedicated narrative fields; one HR-created YEAR_END review
per annual cycle; Annual Performance Score numeric only with no label shown or stored
(labels a future policy decision introducible with no DB or calculation change). Plus
an ARCHIVED terminal state and a Performance Journey visual.

Schema (additive): Review gains annualPerformanceScore and four narrative fields;
ReviewStatus gains ARCHIVED; ReviewEventType gains ARCHIVED.

Verification: Stage 4 acceptance harness 9/9; Stage 3 regression 6/6; Stage 2
regression 6/6; typecheck clean; manual walk-through across employee, manager, and
archived states. Prototype release; fictional data only.

Deferred: employee start date for true N/A on mid-year joiners (backlog); descriptive
rating labels for the annual score (future policy); quarterly consistency follow-up.

# Changelog

All notable changes to the Tarabut People Hub are recorded here.
Format follows the spirit of Keep a Changelog. Versions are internal milestones.

---

## [0.2] — 2026-07-14

Stage 2 (quarterly review workflow) — **Approved as prototype baseline (conditional on Stage 1 UI spot-check).**

### Added
- Quarterly review creation for an open cycle (HR), idempotent.
- Employee workflow: self-scores (Impact, Quality, Delivery), OKR contribution, development action, reflection; draft saving; submit to manager.
- Manager workflow: open, separate manager scores, development action, return to employee, complete.
- Quarterly score calculation (mean of the manager's three scores, one decimal).
- Guarded review state machine (Not started, In progress, Submitted, Awaiting manager, Complete, Reopened) rejecting illegal transitions.
- Reopen and close (manager or HR); reopen requires a reason.
- Audit Timeline: user-facing, review-scoped activity history in its own table, separate from the compliance audit log. Records Created, Draft saved, Submitted, Returned, Manager opened, Manager completed, Reopened, Closed with timestamp, user and action. "Manager opened" hidden from the employee.
- Automated acceptance test harness (scripts/stage2-acceptance.ts).
- .devcontainer providing persistent PostgreSQL across Codespace rebuilds.

### Fixed
- Client-side save-then-submit race that intermittently failed submission; resolved with atomic submit/complete server actions.
- Pre-existing Stage 1 Next.js 15 async searchParams error on the Directory page.
- Pre-existing Stage 1 Next.js 15 async params error on the Employee Profile page.

### Not included (deliberately out of Stage 2 scope)
- Annual Values Review, Year-End Summary, reporting, dashboards.

### Known limitations (carried forward, unchanged)
- Import commit is not wrapped in a database transaction.
- Prototype only: mock authentication, public cloud dev environment; not fit for real employee data pending real Entra ID auth, hosting, and data residency review.

---

## [0.1] — 2026-07-13

Stage 1 (foundation) — **Approved for the prototype.**

### Added
- Project setup: Next.js 15, TypeScript, Prisma, PostgreSQL; modular structure.
- Database schema for all Stage 1 tables.
- Microsoft Entra authentication architecture with a mock provider only.
- Employee import module (Zoho-style CSV: upload, validate, preview, commit).
- Employee Directory, Employee Profile, My Team screens.
- Role-based navigation for four roles, enforced server-side.
- Global search (HR / HR Admin); notifications placeholder; rating-guide-category support.
- Seeded fictional data.

### Fixed (found during Stage 1 testing)
- Sign-in in Codespaces: origin/forwarded-host mismatch; resolved via serverActions.allowedOrigins in next.config.mjs.
- Employee import validation: commit crashed on invalid status and could partially write; resolved in src/core/employees/import.ts.
- db:reset script called migrate reset on a project with no migrations; changed to prisma db push --force-reset.

### Known limitations (accepted at approval)
- Import commit not transaction-wrapped.
- Prototype only: mock authentication, public cloud dev environment.
