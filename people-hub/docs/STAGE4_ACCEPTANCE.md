# Stage 4 / Release v0.5 — Year-End Summary — Acceptance Record

Status: complete and verified, pending Ash's formal approval.
Prototype release. Fictional data, mock authentication. No real employee data.

## What was delivered
Per-employee Year-End Summary (YEAR_END review) assembling the year's quarterly and
values results plus year-end narrative and outcome, per the Excel master template:
header and a quarter-by-quarter journey; Annual Performance Score (mean of completed
quarterly Q Scores, numeric only, "N of 4" basis, handles 1 to 4 quarters); the two
year-end scores side by side (performance and values), never blended; four dedicated
narrative fields; electronic acknowledgement moving the review to a read-only ARCHIVED
state (HR-only reopen); and a flagship conversation-guided screen with a
state-dependent voice and confident purple-to-teal branding. Plus a CEO and full
reporting hierarchy (so all staff except the CEO get reviews) and a restructured
reviews list page (personal first; separate HR administration section).

## Decisions made (approved)
1. Mandatory: Employee Self-Assessment; Manager Assessment + Development Plan. Areas
   for Growth optional. 2. Values review must be complete before year-end completion.
3. Four dedicated narrative fields. 4. One HR-created YEAR_END review per annual cycle.
5. Annual Performance Score numeric only; no label shown or stored; labels a future
   policy decision with no DB/calculation change. Plus ARCHIVED terminal state and a
   Performance Journey visual.

## Verification
Stage 4 harness 9/9 (scripts/stage4-acceptance.ts): idempotent creation; assembly
(mean of completed quarters, N of 4); submit blocked without self-assessment; complete
blocked until values complete; complete blocked without development plan; numeric-only
completion (no label persisted); acknowledge archives (ACKNOWLEDGED + ARCHIVED events);
HR-only reopen; access control. Stage 3 regression 6/6; Stage 2 regression 6/6;
typecheck clean. Manual walk-through completed across employee, manager, and archived
states.

## Risks accepted
Reuses shared workflow + new ARCHIVED state (mitigated by both regression suites,
green). Year-end depends on quarterly/values data; assembly handles partial data. CEO
has no review (correct top-of-org); reviewing top leads needs CEO sign-in in the mock
prototype.

## Deferred work / known limitations
Employee start date for true N/A on mid-year joiners (backlog; interim shows "no review
recorded" and scores completed quarters only). Descriptive rating labels for the annual
score (future policy). Who reviews the most senior leaders (open policy). Provisional
colours + font licence (pre-production). Quarterly consistency follow-up (queued).

## Lessons learned
Harness "failure" was a fixture issue (access test picked an HR user as the stranger),
not a bug. A real gap surfaced in manual testing: four leads had no manager and no
reviews; adding a CEO + full hierarchy fixed it. Nested React components caused the
textarea to lose focus; inlining fixed it. Long terminal heredocs remain fragile;
editor paste is reliable.

## Next release objective
Release v0.6 (Stage 5): HR Dashboard. Not to begin until v0.5 is formally approved.
