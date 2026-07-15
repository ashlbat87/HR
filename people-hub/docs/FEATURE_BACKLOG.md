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
