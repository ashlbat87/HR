# Resume Next — v0.9 Moderation & Calibration

v0.8 Reporting & Insights is COMPLETE and ACCEPTED (signed off 31 Jul 2026, see
docs/APPROVALS.md). Next milestone: v0.9 Moderation & Calibration.
If restarted: `npm run typecheck`, `npm run db:reset`, then
`npx tsx scripts/seed-reporting-demo.ts` (demo period current; re-run if reports look empty).
`rm -rf .next` before viewing after style changes. Do NOT upgrade Prisma (stay 5.22.0).

## v0.8 — done and signed off
Full reporting suite (landing + 7 reports), time-scoped, drillable, CSV export, design system
applied consistently, gaps redesigned around direction. Harnesses: 7a 27/27, criterion 12/12,
7d 8/8, gap-direction 9/9; regressions stage2 6/6, stage5 8/8. Decisions PD-001..PD-028.

## Resume point — v0.9 Moderation & Calibration (Planned)
Not yet designed. Key architectural seam already in place: getOfficialScore() in
reporting-queries.ts returns the manager score TODAY, and is the documented seam where
moderation will apply — PD-002/003 require that moderation NEVER overwrites the original
manager rating (store the moderated value separately; original always preserved/auditable).
Criterion analysis reads item scores directly and is intentionally UNAFFECTED by moderation
(PD-026). Start v0.9 with a design note (approval-gated, like every prior stage) before build.
See docs/FEATURE_BACKLOG.md for the v0.9 moderation data-model spec notes.

## Also open (backlog, not v0.9-blocking)
- Cycle-creation governance (structured labels/validation) — docs/FEATURE_BACKLOG.md.
- Design-system refinements not yet applied — docs/REPORTING_DESIGN_SYSTEM.md.
- Production gate is v0.12 (real auth, hosting, data residency, DPIA).

## Orientation
cd /workspaces/HR/people-hub && git --no-pager log --oneline -6 && git status --short && cat docs/RESUME_NEXT.md
