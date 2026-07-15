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

## Stage 4 / Release v0.5 — Year-End Summary (planning approved; in build)
Planning approved with HR decisions. Delivery pending.
Decisions: (1) mandatory narrative — Employee Self-Assessment; Manager Assessment + Development Plan; Areas for Growth optional. (2) Values review must be complete before year-end completion. (3) Four dedicated narrative fields. (4) One HR-created YEAR_END review per annual cycle. (5) Annual Performance Score numeric only — no label shown or stored; labels a future policy decision introducible with no DB/calculation change. Plus: Archived terminal state (read-only after manager completion + employee acknowledgement; HR-only reopen); a Performance Journey visual (Q1–Q4 progression + annual score, existing components).
Risks accepted (planning): reuses shared workflow (regression via Stage 2 + Stage 3 harnesses); year-end depends on quarterly + values data existing.
Deferred: descriptive rating bands/labels (future policy); scheduled deadline enforcement (v0.9).
Known limitations: designed to handle 1–4 completed quarters with basis shown.
Lessons: TBD on completion.
Next objective: build and accept v0.5, then v0.6 HR Dashboard (only after v0.5 approval).
