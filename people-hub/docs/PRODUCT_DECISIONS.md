# Product Decision Log — Tarabut People Hub

The authoritative record of significant product, UX, architectural, and data-model
decisions, and why they were made. This is the single source of truth for settled
questions. Before any significant architectural change, check it for conflicts with an
existing decision; if a change supersedes a decision, mark the old entry Superseded and
add a new entry that references it.

Each entry: ID, Date, Title, Decision, Rationale, Alternatives (where relevant), Impact,
Status (Active / Superseded / Deprecated), and Applies-from (what is actually built vs
what governs a future release, so the log never overstates the product).

Status legend: Active = current policy. Superseded = replaced by a later decision (linked).
Deprecated = no longer applies. Applies-from clarifies live-now vs governs-future.

---

## PD-001 — Performance and Values remain separate throughout the platform
- Date: backfilled (established through v0.1-v0.5.1)
- Decision: Performance and values ratings are never blended, combined, averaged into a
  composite, shown as a combined distribution, or used for a combined ranking, anywhere in
  the platform, now or in future releases (reporting and moderation included).
- Rationale: they measure different things; blending destroys meaning and defensibility.
- Impact: all reporting (v0.8) and moderation (v0.9) compute and present them separately.
- Status: Active. Applies-from: whole platform, all releases.

## PD-002 — Manager rating determines the submitted review outcome
- Date: backfilled (established v0.2)
- Decision: the manager's rating is the official score of a submitted review. Performance
  and values (and manager vs self) scores are never blended; the manager rating stands as
  the outcome.
- Rationale: a single accountable owner of the official rating; clear, auditable.
- Impact: reporting reads the manager rating as "official" today via a resolver (PD-003).
- Status: Active. Applies-from: live since v0.2 (until a v0.9 moderated rating supersedes
  per PD-003).

## PD-003 — Moderation introduces a separate moderated rating; never overwrite the original
- Date: backfilled (agreed during v0.8 planning)
- Decision: v0.9 moderation records a separate moderated rating plus reason, decision
  maker, decision date, calibration session, and audit history. The original manager
  rating is preserved permanently and remains visible. Policy: before calibration the
  submitted manager rating is official; after an approved calibration decision the
  moderated rating becomes the official final rating; the original remains for transparency
  and audit. v0.8 reporting reads "official rating" through a resolver that returns the
  manager rating today and the approved moderated rating once v0.9 exists, with no change
  to reporting code.
- Rationale: defensibility and transparency (PDPL/SAMA); never silently alter a record.
- Alternatives considered: overwrite the manager rating (rejected: destroys the original
  and the audit trail).
- Impact: v0.8 must architect the resolver and shape queries for original-vs-moderated.
- Status: Active (approved). Applies-from: governs v0.9; the resolver seam is built in v0.8
  but returns the manager rating only until v0.9 is implemented.

## PD-004 — Reporting and Moderation split into separate releases (v0.8, v0.9)
- Date: backfilled (v0.8 planning)
- Decision: v0.8 = Reporting & Insights (analytical foundation + Manager Accountability
  View); v0.9 = Moderation & Calibration (formal calibration workflow) built on top.
- Rationale: the combined scope was too large for one testable release; reporting is the
  foundation moderation needs.
- Alternatives considered: one combined release (rejected: too big, higher risk).
- Impact: roadmap updated; v0.8 excludes any moderation workflow.
- Status: Active. Applies-from: v0.8 / v0.9.

## PD-005 — HR Dashboard replaces Review Admin once functional parity is achieved
- Date: backfilled (v0.7)
- Decision: the HR Dashboard plus /reviews-browse plus /periods replace the old Review
  Admin page; Review Admin retired only after a parity checklist confirmed every capability
  (generate reviews; browse all; open/reopen incl. archived year-end) was covered.
- Rationale: one coherent HR surface; no capability lost.
- Impact: Review Admin removed in v0.7; nav is Dashboard / Browse reviews / Review periods.
- Status: Active. Applies-from: live since v0.7.

## PD-006 — Reporting & Insights is HR-only in v0.8
- Date: backfilled (v0.8 planning)
- Decision: the Reporting & Insights module is restricted to HR/HR Admin in v0.8, guarded
  server-side.
- Rationale: org-wide rating data is sensitive; only HR should see it at this stage.
- Impact: non-HR are redirected; managers/employees have no org-wide reporting in v0.8.
- Status: Active. Applies-from: v0.8.

## PD-007 — Small-population suppression disabled for HR; built as a future capability
- Date: backfilled (v0.8 planning)
- Decision: no minimum-group-size suppression in v0.8. Instead, every organisational
  comparison shows the population it is based on ("based on N reviews"). Suppression is
  built as a dormant, permission-configurable capability defaulted OFF.
- Rationale: Reporting is HR-only and HR is already authorised to see individual data, so
  suppression would reduce usefulness (calibration needs small teams) without adding real
  protection. Showing N gives honest confidence context instead of hiding data.
- Alternatives considered: n<5 suppression (rejected for HR; retained as a future
  permission-gated option if reporting is ever opened beyond HR).
- Impact: comparisons display for all group sizes with their true n.
- Status: Active. Applies-from: v0.8 (dormant capability retained for future access
  expansion).

## PD-008 — Manager Accountability focuses on participation and process, not quality
- Date: backfilled (v0.8 planning)
- Decision: the Manager Accountability View measures participation/process only (reviews
  awaiting, completion %, median completion time, reopened reviews, trends). No manager
  quality score, no league table, no punitive labels, no AI judgement. Drill-down to the
  underlying reviews.
- Rationale: accountability for process is fair and actionable; scoring manager quality
  from these signals is not defensible and invites misuse.
- Impact: view kept visually and conceptually separate from rating calibration.
- Status: Active. Applies-from: v0.8.

## PD-009 — Reporting & Insights UX frozen after v0.8 design approval
- Date: backfilled (v0.8 design approval)
- Decision: following approval of the rev 3 design note and wireframes, the Reporting &
  Insights UX is frozen. No further redesign unless testing identifies a genuine usability
  issue. Focus shifts to implementation quality, performance, testing, accessibility, docs.
- Rationale: stop design churn; deliver.
- Impact: implementation proceeds against a fixed design.
- Status: Active. Applies-from: v0.8.

## PD-010 — Executive Summaries are rule-based, not AI-generated
- Date: backfilled (v0.8 design)
- Decision: Executive Summaries are generated deterministically from metrics and the
  configurable Insight Rules; they answer "what happened / what should HR know / what
  should HR do", the last from a fixed, bounded phrase set. No AI.
- Rationale: deterministic, auditable, neutral; no hallucination or judgement risk.
- Impact: an Insight Rules config plus a summary rule engine; no model calls.
- Status: Active. Applies-from: v0.8.

## PD-011 — AI reporting summaries reserved for a future release
- Date: backfilled (v0.8 design)
- Decision: a space is reserved at the bottom of the reporting landing page for a future
  AI Summary panel; nothing AI is built in v0.8.
- Rationale: keep the option open without building or implying it now.
- Impact: a reserved, empty layout slot; no AI dependency in v0.8.
- Status: Active. Applies-from: reserved for a future release (not v0.8).

## PD-012 — Every reporting metric must support drill-down to the underlying data
- Date: backfilled (v0.8 design)
- Decision: every figure in Reporting & Insights drills to the underlying employees/
  reviews, with a breadcrumb showing the path.
- Rationale: numbers must be traceable to be trusted and actioned; supports calibration.
- Impact: reporting reuses the v0.7 filtered-browser drill-down pattern.
- Status: Active. Applies-from: v0.8.

## PD-013 — Each review type has its own workflow and reporting model
- Date: backfilled (established v0.2-v0.5)
- Decision: Performance (quarterly), Values, and Year-End reviews each follow their own
  workflow (quarterly 3 stages; values 4 with acknowledgement; year-end 4, archives on
  acknowledge) and are reported per their own model. The dashboard and reporting are
  stage-aware per type.
- Rationale: the types genuinely differ; forcing a single model misrepresents them.
- Impact: stage-aware queries in v0.7 and v0.8.
- Status: Active. Applies-from: live since v0.2-v0.5.

## PD-014 — Releases remain small, testable, and acceptance-gated
- Date: backfilled (established v0.1 onward)
- Decision: work proceeds in small stages, each with an acceptance harness and an explicit
  approval gate; no release is signed off without passing its harness and the regressions,
  and no approval is recorded until Ash explicitly approves.
- Rationale: quality, reversibility, and a defensible audit trail.
- Impact: every stage has a harness and a recorded approval.
- Status: Active. Applies-from: whole project.

---

## Process
Going forward, every significant product, UX, architectural, or data-model decision is
recorded here as part of normal development. Before introducing a significant
architectural change, check this log for conflicts; if superseding, mark the old entry
Superseded (with a link) and add the new decision. This log is the authoritative record of
why decisions were made.

## PD-015 — Version renumber to accommodate Moderation at v0.9
- Date: 24 July 2026
- Decision: with Moderation & Calibration taking v0.9 (PD-004), the previously-planned
  releases shift down one: Notifications & Reminders (incl. deadline locking) moves to
  v0.10; Historical Migration & Production Hardening moves to v0.11; v1.0 unchanged. The
  prototype era is now v0.1-v0.10 and the production transition is v0.11.
- Rationale: reflect the reporting/moderation split (PD-004) in a coherent sequence
  without leaving planned work orphaned.
- Impact: PRODUCT_ROADMAP.md and RELEASE_HISTORY.md tables updated; stale "v0.10 production
  gate" references in APPROVALS.md and FEATURE_BACKLOG.md corrected to v0.11.
- Status: Active. Applies-from: roadmap sequencing from v0.8 onward.

## PD-016 — Rating distribution methodology: per-review headline, rounded half-up
- Date: 24 July 2026
- Decision: a "rating distribution" places one data point per review = that review's
  official score (mean of the manager-side item scores for the dimension) rounded half-up
  to a 1-5 level. The "average" metric uses the precise (unrounded) mean; only the
  distribution buckets use the rounded level. Performance and values computed separately.
- Rationale: calibration and moderation operate on a person's overall rating, so one
  review = one data point is the meaningful unit (not per-item scores, which multiply
  people by item count). Precise average + rounded buckets keeps both accurate.
- Alternatives considered: distributing individual item scores (rejected: not "how are
  people rated", and distorts by item count).
- Impact: computeDistribution in reporting-queries.ts; documented in the metric dictionary.
- Status: Active. Applies-from: v0.8 reporting.

## PD-017 — Reporting tests use an isolated fixture, not the application seed
- Date: 24 July 2026
- Decision: the reporting acceptance harness builds its own controlled fixture (completed
  reviews with known scores, gaps, groups, and completion-time events), asserts against
  hand-computed expected values, and tears the fixture down. It does not rely on or modify
  the application seed.
- Rationale: the app seed exists for workflow testing/exploration; reporting assertions
  must be deterministic against known answers, and expanding the seed for reporting could
  disturb other modules, dashboards, and harnesses.
- Impact: scripts/stage7a-acceptance.ts is self-contained; a future optional "reporting
  demo seed" (for 7b demos) would be separate from both the app seed and this fixture.
- Status: Active. Applies-from: v0.8 reporting tests onward.

## PD-018 — Reporting analytics layering model (Outcome / Diagnostic / Behaviour)
- Date: 24 July 2026
- Decision: the reporting suite is organised into three distinct analytical layers, kept
  conceptually and visually separate: (1) Outcome — the overall official rating ("who is
  performing"; moderated in v0.9); (2) Diagnostic — the performance criteria Impact/Quality/
  Delivery ("why they perform that way"; read from item scores, NOT moderated); (3)
  Behaviour — the values ("how they behave"; separate from performance). No report blends
  layers. New reports declare which layer they serve.
- Rationale: the layers answer fundamentally different questions; blending is a category
  error and would undermine PD-001. The model keeps the growing suite coherent.
- Impact: governs report design in v0.8+; criterion analysis is the first Diagnostic report.
- Status: Active. Applies-from: v0.8 reporting onward.

## PD-019 — Strategic Alignment: OKR quarters tie to review periods (no parallel calendar)
- Date: 24 July 2026
- Decision: an OkrQuarter links to an existing ReviewPeriod so "the OKRs for this review"
  resolves deterministically (a Q2 2026 review surfaces the Q2 2026 OKRs). The module does
  not invent an independent OKR calendar.
- Rationale: two sources of "what quarter is it" would risk mismatch at exactly the review-
  integration point that matters most.
- Alternatives considered: standalone OKR calendar (rejected: drift/mismatch risk).
- Impact: shapes the Strategic Alignment data model and the review integration.
- Status: Active (approved). Applies-from: governs the Strategic Alignment stage (v0.10),
  not yet built.

## PD-020 — Strategic Alignment OKRs are context-only
- Date: 24 July 2026
- Decision: OKRs surfaced in the review provide CONTEXT for the contribution answer only.
  They are never scored, never blended into ratings, and never alter the review workflow or
  its states. Permanent invariant.
- Rationale: protects the integrity of the reviewed-and-signed-off review workflow as the
  alignment module grows; keeps ratings clean (reinforces PD-001/PD-002).
- Impact: the review integration is a read-only panel; no workflow or rating change.
- Status: Active (approved). Applies-from: governs the Strategic Alignment stage (v0.10).

## PD-021 — Strategic Alignment is read-first before write-first
- Date: 24 July 2026
- Decision: v1 of Strategic Alignment is a single source of truth for organisational
  objectives to improve alignment throughout the quarter. It is intentionally NOT an OKR
  management system, progress-tracking tool, or employee goal-setting module. Any future
  progress tracking or individual objective management is a SEPARATE product decision, not
  an incremental addition to this module.
- Rationale: scope discipline; prevents the module sprawling into a full OKR-management
  suite before the read-first value is delivered and validated.
- Impact: v1 scope is define/manage/view/surface-in-review only; ambitious capabilities are
  future and separately decided.
- Status: Active (approved). Applies-from: Strategic Alignment stage (v0.10).

## PD-022 — Roadmap: Strategic Alignment inserted at v0.10; later releases renumbered
- Date: 24 July 2026
- Decision: Strategic Alignment is inserted after v0.9 as v0.10 (Approved — not yet
  scheduled). Notifications & Reminders moves to v0.11; Historical Migration & Production
  Hardening moves to v0.12; v1.0 unchanged. Prototype era now v0.1-v0.11; production
  transition v0.12.
- Rationale: reflect the approved new stage in a coherent sequence.
- Impact: PRODUCT_ROADMAP.md and RELEASE_HISTORY.md updated; stale gate references corrected.
- Status: Active. Applies-from: roadmap sequencing.

## PD-023 — Reporting time scoping: default to a cycle, opt-in full year, per-report filter
- Date: 24 July 2026
- Decision: reports scope to a single CYCLE by default (one quarter for performance; one
  values cycle for values), not the whole period. A per-report, first-class timeframe filter
  (not a status label) lets users choose a cycle or "Full year"; only cycles that exist for
  the report's dimension are offered. The selection is carried in the URL (consistent across
  reports, shareable, inherited by drill-down). Reporting is limited to QUARTERLY
  (performance) and ANNUAL_VALUES (values); YEAR_END is excluded from analytical reporting.
  Full year for values is offered only when more than one values cycle exists in the period.
- Rationale: pooling all cycles silently (the previous behaviour) hid per-quarter trends and
  conflated performance's quarterly cadence with values' less frequent cadence.
- Impact: retrofit of distribution, comparison, landing, and drill-down; the 7a query layer
  already accepts cycleId/periodId, so mostly wiring.
- Status: Active. Applies-from: v0.8 reporting (retrofit before further reports).

## PD-024 — Reporting default is the latest MEANINGFUL cycle (configurable threshold)
- Date: 24 July 2026
- Decision: a report defaults to the latest MEANINGFUL cycle of its dimension, not simply the
  newest. If the newest cycle has only just opened with insufficient completed reviews, the
  default stays on the latest COMPLETED cycle until the active cycle reaches a completion
  threshold. The threshold is CONFIGURABLE (owned like the Insight Rules), not hard-coded as
  a percentage; a sensible default is chosen at build and recorded.
- Rationale: prevents a report defaulting to a near-empty, just-opened quarter that reads as
  broken; HR still can select the active cycle explicitly.
- Impact: the default-cycle resolution in the reporting scope layer.
- Status: Active. Applies-from: v0.8 reporting.

## PD-025 — Pooling is never silent
- Date: 24 July 2026
- Decision: whenever reporting combines multiple cycles into a Full Year view, the UI must
  explicitly state the report is based on pooled data. Every report must always make the
  timeframe, population, and reporting dimension clear to the user.
- Rationale: users must always understand exactly what they are analysing; silent pooling
  misleads.
- Impact: Full Year views carry an explicit pooled-data statement; all reports show
  timeframe + population ("based on N") + dimension.
- Status: Active. Applies-from: v0.8 reporting onward.

## PD-026 — Performance criterion analysis reads item scores directly (Diagnostic layer)
- Date: 24 July 2026
- Decision: the performance-criterion report (Impact/Quality/Delivery) computes from the
  MANAGER-side item scores in ReviewRating DIRECTLY, not through the official-rating resolver
  (getOfficialScore). It therefore sits one level below the headline rating.
- Consequence: v0.9 moderation adjusts the OVERALL rating, not individual criteria, so
  criterion analysis is unaffected by moderation and always reflects the original manager
  item scores. This is intended and must be preserved.
- Layer: this is the first Diagnostic-layer report (PD-018) — "why are people performing that
  way" — distinct from the Outcome-layer distribution report ("who is performing").
- Rationale: criteria are not themselves moderated; showing original item scores is the
  correct, transparent behaviour.
- Impact: getCriterionBreakdown + reviewsInCriterionBucket in reporting-queries.ts; verified
  by stage7c-criterion-acceptance.ts (12/12, hand-computed).
- Status: Active. Applies-from: v0.8 criterion report; persists through v0.9 moderation.

## PD-027 — Reporting & Insights design system (landing = reference)
- Date: 30 July 2026
- Decision: the approved Reporting landing establishes the module's design language
  (typography, spacing, card styling, KPI presentation, navigation, timeframe control, hover
  states, hierarchy). Captured in docs/REPORTING_DESIGN_SYSTEM.md; tokens/classes added to
  globals.css additively (no existing colour/neutral tokens redefined; no existing classes
  changed).
- Scope: information architecture UNCHANGED. This is presentation only. "Needs Attention" is
  the one new IA element, added deliberately, and is neutral/observational (upholds PD-008,
  PD-010).
- Working rule: report pages adopt the language while optimising for their content (feel like
  one product, not identical). Improvements found while building later pages are RECORDED in
  the design-system doc and applied together at a final UX consistency review, never ad hoc.
- Status: Active. Applies from v0.8 Stage 7f onward.
