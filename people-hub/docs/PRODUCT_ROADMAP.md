# Tarabut People Hub — Product Roadmap

Both Stage and Release numbers shown. Prototype era (fictional data, mock auth) runs
through to the production gate. No real employee data before the production gate.

| Stage | Release | Name | Status |
|-------|---------|------|--------|
| Stage 1 | v0.1 | Foundation (directory, profiles, access, data model) | Complete |
| Stage 2 | v0.2 | Quarterly Reviews | Complete |
| Stage 3 (design) | v0.3 | Product Experience & Design System | Complete |
| Stage 3 | v0.4 | Annual Values Review | Complete |
| Stage 4 | v0.5 | Year-End Summary | Complete, verified (pending approval) |
| Stage 5 | v0.6 | Review Cycle & Year Management | Next (after quarterly rating definitions) |
| — | v0.7 | HR Dashboard | Planned |
| — | v0.8 | Reporting, Moderation & Calibration | Planned |
| — | v0.9 | Notifications & Reminders (incl. review deadline locking) | Planned |
| — | v0.10 | Historical Migration & Production Hardening (real auth, hosting, residency, DPIA; import of completed/historical performance reviews) | Planned (prototype→production gate) |
| — | v1.0 | Production-Ready MVP | Planned |

## In progress (before v0.6)
- Quarterly rating definitions and per-level descriptions: seed the real performance
  anchors for the five department guides (currently placeholder) and show the relevant
  department's definition on the quarterly form, matching the values screen.

## v0.6 — Review Cycle & Year Management (scope)
Foundational: lets the tool run year over year.
- Introduce a Year (review period) as a first-class entity.
- HR defines a year (e.g. 2026); all that year's cycles are tied to it.
- HR opens cycles of each type within a year: the four quarterly reviews, the annual
  values review, and the year-end summary.
- Completing a year archives that year's cycles and reviews under it (read-only).
- HR can start a new year (e.g. 2027); new cycles are tied to the new year.
- Data-model change: a Year/period entity that groups cycles (today the year is only a
  text label on each cycle).

## Standing deferred items (tracked in docs/FEATURE_BACKLOG.md)
- Review deadline locking — approved, scheduled with Notifications (v0.9).
- Employee start date / applicable quarters — backlog (for true N/A on mid-year joiners).
- Descriptive rating labels for the annual performance score — future policy decision.
- Provisional neutral/semantic colours and Founders Grotesk webfont licence — pre-production.
- "Reset" is satisfied by the existing reopen capability; no data-wipe feature will be
  built (retaining performance records is a PDPL/SAMA requirement).
  - Manager Accountability View — future (v0.8+, Reporting/Insights). Operational patterns
  in manager participation/follow-through. Guardrails: not a manager-quality score, no
  league table, context/trends not punitive labels, any AI advisory and human-reviewed.
  Recorded pre-coding during v0.7; not built in v0.7. Detail in docs/FEATURE_BACKLOG.md.

## Next objective
Release v0.7 (HR Dashboard — Performance Operations Cockpit). Design approved
(docs/STAGE6_v0_7_DESIGN.md); building in staged gates 6a-6e. v0.6 (Review Cycle &
Period Managem.