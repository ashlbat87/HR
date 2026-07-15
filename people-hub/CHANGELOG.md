## [0.5] — Stage 4 / Release v0.5: Year-End Summary (planning approved; implementation starting)

Planning approved with HR decisions incorporated. Implementation beginning; this
entry completes when built and accepted.

Scope: a per-employee YEAR_END review assembling the four quarterly reviews and the
annual values review, with an Annual Performance Score (average of completed quarterly
manager Q Scores), the values score shown separately (never blended), four dedicated
narrative fields, a Performance Journey visual, electronic acknowledgement, and a new
Archived terminal state.

Approved HR decisions:
1. Mandatory: Employee Overall Self-Assessment (employee); Manager Overall Assessment
   and Development Plan (manager). Optional: Areas for Growth.
2. The Annual Values Review must be complete before the Year-End Summary can be
   completed (it may be prepared beforehand).
3. Four explicit dedicated narrative fields (no reuse of generic columns).
4. One YEAR_END review per employee per annual cycle, HR-created.
5. Annual Performance Score is numeric only for v0.5 — no descriptive band/label shown
   or stored; numeric score is the source of truth; labels are a future policy decision
   introducible later with no DB or calculation change.

Additional: (a) Archived terminal state — after manager completion and employee
acknowledgement the review becomes read-only Archived; only HR may reopen. (b) A small
Performance Journey visual showing Q1–Q4 progression and the annual score, using
existing design-system components.

Architecture: reuses the shared workflow, state machine, timeline, audit,
acknowledgement, permissions, rating-label mapping, and the v0.4 two-score component.
New: assembly query, four narrative fields, Archived state, Performance Journey visual.
Stage 2 and Stage 3 regression harnesses are mandatory gates.

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
