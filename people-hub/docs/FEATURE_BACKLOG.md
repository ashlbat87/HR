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

## "How performance works" employee guide — BACKLOG (surfaced during quarterly definitions work)
Status: idea captured; NOT yet scoped or scheduled. Small, self-contained.
Need: an in-product reference that explains the full performance process to all
employees, so the cycle and expectations are clear in one place rather than tribal
knowledge.
Likely scope (to confirm when built): the annual cycle (Q1 to Q4 quarterlies, the
annual values review, the year-end summary) and what each stage is for; the rating
scale and label meanings (Poor, Base, Intermediate, Advanced, Rock Star); who rates
whom; how self-assessment and manager assessment work together; and the core
principles (performance and values are never blended; the manager rating is the
official score).
Open questions for when we build it:
1. Static content vs HR-editable. Lean: static for the prototype; editable-by-HR is a
   larger feature that could come later.
2. A dedicated nav page ("How performance works") vs contextual help links on the
   review screens. Lean: a dedicated nav page, with contextual links a possible later
   addition.
3. Much of the substance already exists in decisions and labels we have built (rating
   labels, cycle structure, the never-blended principle), so this is more a
   content-and-presentation task than a complex build.
Note: no data-model impact expected; it surfaces existing information in one
employee-friendly place.

## HR admin consolidation — v0.7 (HR Dashboard) [surfaced during v0.6]
Status: agreed direction; do at v0.7, not before.
Context: during v0.6 we considered removing the standalone Review admin page, since HR
should see review status on the dashboard. But the dashboard is still a Stage 1
placeholder (headcounts only); it does not yet show review status or let HR browse all
reviews. Removing Review admin now would be a functional regression (it is the only
surface to browse every review and reach an archived year-end to reopen it).
Plan for v0.7:
- Build real review status / cycle-progress into the HR Dashboard.
- Absorb Review admin's "browse all reviews" (and the reopen-archived-year-end path)
  into the dashboard.
- Then remove the standalone Review admin page.
- Consider bringing period management (the Review periods page) under one coherent HR
  admin surface, and settle naming then (e.g. a single "HR admin" area).
Until then: keep both the Review admin page and the Review periods page as they are.
