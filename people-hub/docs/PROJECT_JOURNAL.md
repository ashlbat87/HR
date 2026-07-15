# Tarabut People Hub — Project Journal

Permanent handover record. One entry per release, recording what was delivered,
decisions made, risks accepted, deferred work, known limitations, lessons learned,
and the next release objective. Both Stage and Release numbers are recorded.
Written candidly: missteps and fixes are included, because the value is honest
institutional memory for the future owner.

Maintenance: updated at each release (triggered by explicit request, as the build
assistant has no memory across sessions).

---

## Stage 1 / Release v0.1 — Foundation (approved)
Delivered: directory, profiles, role-based access, CSV import, mock auth, Stage 1 data model, seeded fictional data.
Decisions: type-agnostic schema from the start (ReviewType enum, free-string rating item) so later review types are additive; mock auth to defer real Entra to production.
Risks accepted: prototype auth; import not transaction-wrapped; cloud dev environment.
Deferred: real auth, hosting, residency (v0.9).
Known limitations: fictional data only.
Lessons: early architectural restraint paid off; values reviews later needed almost no structural change.
Next objective: quarterly review workflow.

## Stage 2 / Release v0.2 — Quarterly Reviews (approved, conditional)
Delivered: full quarterly workflow, two-sided scoring, drafts, guarded state machine, quarterly score, narrative fields, user-facing timeline; acceptance harness 6/6.
Decisions: server-enforced state machine; "manager opened" hidden from employee; atomic save-then-submit to fix a client race.
Risks accepted: import not transaction-wrapped; approved conditional on a manual Stage 1 UI spot-check (still outstanding).
Deferred: values, year-end, dashboards, reporting.
Known limitations: prototype only.
Lessons: an automated harness caught a race manual testing missed.
Next objective: apply the Tarabut design system.

## Stage 3-design / Release v0.3 — Product Experience & Design System (approved)
Delivered: Design System v1.1, component library, UI modernisation applied to every screen; six future concept mock-ups; product design philosophy.
Decisions: brand colours official; neutral/semantic colours provisional (official file was broken); Documents module dropped (central repository is system of record).
Risks accepted: provisional colours and unconfirmed font licence carried forward.
Deferred: rating-guide anchors on quarterly form; nav icons/active-state.
Known limitations: fallback font stack; no embedded font.
Lessons: screen-by-screen gates worked; Codespace rebuilds reverted uncommitted work until we committed and pushed everything.
Next objective: Annual Values Review.

## Stage 3 / Release v0.4 — Annual Values Review (approved, complete)
Delivered: two-sided values workflow, four values with inline anchors, manager-only values score kept separate from performance, draft/return/reopen/close, rating-difference highlighting, timeline + audit, acknowledgement, employee sees manager assessment when complete; Stage 3 harness 6/6; Stage 2 regression 6/6.
Decisions: generalise shared workflow (Option C — shared internals, separate presentational form, quarterly UI untouched); separate named score fields enforce never-blend at schema; acknowledgement as event + denormalised pointer; overall summary redesigned to a calm compact row.
Risks accepted: generalisation touched shared code (regression gate mitigated); anchor wording placeholder.
Deferred: review deadline locking (approved; scheduled v0.8); quarterly consistency change; provisional colours/font.
Known limitations: prototype; deadlines not yet enforced.
Lessons: harness "failures" were dirty-data/wrong-email fixture faults, not product bugs — diagnose before assuming regression; long terminal heredocs are fragile; the build assistant's sandbox diverged from the Codespace, so state must be confirmed from the Codespace; db:reset had reverted to a migration-based reset and was corrected.
Next objective: Year-End Summary.

## Stage 4 / Release v0.5 — Year-End Summary (delivered, verified)
Delivered: per-employee YEAR_END review assembling the year's quarterly and values results plus year-end narrative and outcome, per the Excel master template. Quarter-by-quarter journey; Annual Performance Score (mean of completed quarterly Q Scores, numeric only, N of 4 basis, handles 1 to 4 quarters); the two year-end scores side by side (performance, values), never blended; four dedicated narrative fields; electronic acknowledgement moving the review to a read-only ARCHIVED state (HR-only reopen); a flagship conversation-guided screen with state-dependent voice and purple-to-teal branding. Plus a CEO and full reporting hierarchy (all staff except the CEO now get reviews) and a restructured reviews list page (personal first, separate HR administration section).
Decisions: (1) mandatory narrative (employee self-assessment; manager assessment + development plan; areas for growth optional); (2) values review must be complete before year-end completion; (3) four dedicated narrative fields; (4) one HR-created YEAR_END review per annual cycle; (5) Annual Performance Score numeric only, no label shown or stored (labels a future policy decision, no DB/calculation change). Plus ARCHIVED terminal state and a Performance Journey visual.
Risks accepted: reuses shared workflow + new ARCHIVED state (mitigated by both regression suites, green); year-end depends on quarterly/values data (assembly handles partial data); CEO has no review (correct top-of-org), reviewing top leads needs CEO sign-in in the mock prototype.
Deferred: employee start date for true N/A on mid-year joiners (backlog; interim shows "no review recorded", scores completed quarters only); descriptive rating labels for the annual score (future policy); who reviews the most senior leaders (open policy); provisional colours + font licence; quarterly consistency follow-up.
Known limitations: prototype only; partial-year handled with basis shown; N/A vs not-yet not distinguished until a start date exists.
Lessons learned: the harness "failure" was a fixture issue (access test picked an HR user as the stranger), not a bug — diagnose before assuming a regression. A real gap surfaced in manual testing: four leads had no manager and got no reviews; adding a CEO and full hierarchy fixed it. Defining React components inside a component made the reflection textarea lose focus each keystroke; inlining fixed it. Long terminal heredocs remain fragile; editor paste is the reliable route for large files.
Verification: Stage 4 harness 9/9; Stage 3 regression 6/6; Stage 2 regression 6/6; typecheck clean; manual walk-through across employee, manager, archived states.
Next objective: Release v0.6 (Stage 5) HR Dashboard — not to begin until v0.5 is formally approved.
