## [0.4] — Stage 3: Annual Values Review (planning approved; implementation starting)

Planning for the Annual Values Review is approved (Product Roadmap v1.0 and Stage 3
Technical Plan). Implementation is beginning; this entry completes when built and accepted.

Planned scope: two-sided values workflow for the four Tarabut values, per-value
employee and manager ratings and comments, values rating guide inline, overall values
score from manager ratings only (never blended with the quarterly score), electronic
acknowledgement (employee sees completed review), user-facing timeline, compliance
audit log, server-side permissions, rating-difference highlighting, draft/return/reopen/close.

Architecture: the shared quarterly workflow and form are being generalised to serve
both review types; the Stage 2 acceptance harness is a mandatory regression gate.

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
