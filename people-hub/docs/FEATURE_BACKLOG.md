# Feature Backlog

## Review Deadline Locking — APPROVED, scheduled with v0.8 (Notifications & Reminders)

Status: approved as a feature; NOT yet implemented. Scheduled to be built alongside
Notifications & Reminders (v0.8), since deadline reminders and deadline enforcement
are two halves of one mechanism. Full plan: Feature_Plan_Deadline_Locking.md.

Purpose: enforce the two-week completion window. When a review passes its deadline
without completion, lock editing, mark it overdue/incomplete, and require HR to
explicitly reopen to finish. Preserves a controlled path to completion; no dead
records.

Approved HR decisions:
1. Deadlines are explicitly configured by HR for each review cycle (not auto-derived).
2. Users see a countdown ("Due in X days") before deadlines.
3. HR reopening an overdue review must set a new explicit deadline.
4. Lazy enforcement in the prototype (checked on open/edit/submit/complete);
   scheduled/background enforcement remains on the production roadmap (v0.9).

Cross-cutting: enforcement lives in the shared workflow guards, so it applies to
BOTH quarterly and annual values reviews. Both acceptance harnesses are its
regression gate. Uses the existing ReviewCycle.employeeDeadline / managerDeadline
fields.

## Employee start date / applicable quarters — BACKLOG (surfaced during v0.5)

Need: the year-end summary should distinguish quarters that did not apply to an
employee (e.g. a mid-year joiner has no Q1) from quarters that applied but have no
completed review. Doing this correctly needs the system to know which quarters
applied — i.e. an employee start/join date (or an explicit applicable-quarters
record).

Decisions already made (v0.5): show the full four-quarter frame; mark
pre-joining quarters as N/A; calculate the annual performance score from
applicable/completed quarters only (denominator is not hardcoded to 4).

Interim (v0.5, no new data): the annual score already averages only the completed
quarterly reviews that exist (so the denominator decision holds). The display shows
four quarters, scores the completed ones, and marks the rest neutrally as "no review
recorded" — it does NOT assert N/A vs not-yet, because without a join date the system
cannot tell them apart. True N/A labelling is deferred to this backlog item.

When built: add an employee start date (additive), derive applicable quarters from it,
and update the year-end display to show N/A for pre-joining quarters. Also useful for
pro-rating, reporting, and onboarding views later.
