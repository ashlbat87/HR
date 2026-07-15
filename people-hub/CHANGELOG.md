## [0.4] — Stage 3: Annual Values Review (COMPLETE)

Annual Values Review delivered and accepted. Two-sided workflow for the four
Tarabut values (Innovate with Impact, Drive Exceptional Results, Deliver Value to
Customers, Win Collectively), each with employee self-rating + comment and manager
rating + comment, and the values rating guide shown inline with anchors.

Overall values score is the mean of the manager's four scores only, stored in a
separate valuesScore field and NEVER blended with the quarterly performance score.
Employee self-scores are recorded and shown for comparison but are never official.

Includes: draft saving, status tracking, validation (all four values required to
submit/complete), return to employee, reopen, close, rating-difference
highlighting, the user-facing audit timeline plus compliance audit log, and
electronic acknowledgement (employee acknowledges having seen the completed review,
recorded as an ACKNOWLEDGED event with denormalised pointer). Once complete, the
employee sees the manager's per-value assessment. Server-side permissions enforced.

Architecture: the shared quarterly workflow and form logic were generalised to
serve both review types (Option C: shared tested internals, separate presentational
form). Quarterly UI left untouched.

Verification: Stage 3 acceptance harness 6/6 (scripts/stage3-acceptance.ts); Stage 2
regression 6/6 (scripts/stage2-acceptance.ts); typecheck clean. Prototype release;
fictional data only.

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
