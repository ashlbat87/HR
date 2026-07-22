# Release v0.5.1 — Review Experience & Rating Design System

Type: point release on top of v0.5 (Year-End Summary). It refines the experience and
introduces the rating design system across the existing review features. It does not
add a new feature area, hence a point release rather than v0.6.

Status: complete and verified. Awaiting Ash's formal sign-off.

## Why this release exists
v0.5 was closed as the Year-End Summary (verified, 9/9). A substantial body of
experience and design work followed before v0.6 began, with no release home. This
record gives that work a home and a verification trail, so v0.6 (Review Cycle & Year
Management) starts from an agreed baseline.

## Delivered
- Annual Values review: premium redesign — value icons, real behavioural anchors and
  criterion definitions seeded from the performance master, official rating labels.
- Real seeded rating-guide content: the single VALUES guide, plus five department
  PERFORMANCE guides (Engineering, Sales/Commercial, Product, Operations, Support
  Functions) with 75 department-specific anchors extracted from the master spreadsheet.
- Rating identity design system (src/modules/performance/RatingBadges.tsx):
  EmployeeRatingCard, ManagerRatingCard, RatingComparison, each with optional comment
  support. Documented in docs/DESIGN_SYSTEM_ratings.md.
- Grouped rating unit ("Your rating" / "Employee rating") applied consistently on both
  the quarterly and values forms: buttons, definition, employee comment, then the
  manager's official card with its comment folded in.
- Quarterly form: the three shared criterion definitions (Impact, Quality, Delivery)
  shown per criterion; the selected level's real department anchor shown inline,
  department-aware (chosen by the reviewed employee's ratingGuideCategory).
- Standalone HR Review administration screen (generate reviews + all-reviews list),
  HR-guarded; the personal reviews page is now personal-only.
- My Reviews categorisation fix: personal reviews and team reviews no longer conflated.
- Seed now drives one employee's quarterly and values reviews to COMPLETE with
  realistic ratings and comments, so screens can be judged against real data.

## Key decisions
- Point release (Option A): do not disturb the verified v0.5; do not renumber the
  roadmap.
- Employee selection renders light purple with a dark outline; the manager rating is
  the bold-purple card, with the manager comment folded inside it, below the employee
  comment. A deep-eggplant treatment was rejected.
- Interactive scoring buttons stay light-purple-selected (not solid), so they never
  compete with the official manager card.
- Criterion definitions are hardcoded (shared across departments); per-level anchors
  are seeded (department-specific). Same pattern as values.
- "Reset" is satisfied by the existing reopen; no data-wipe feature (PDPL/SAMA
  retention).

## Verification
- Stage 2 (Quarterly) acceptance: 6/6.
- Stage 3 (Annual Values) acceptance: 6/6.
- Stage 4 (Year-End) acceptance: 9/9.
- All three re-run after the review-form restructuring, and refactored to be
  seed-independent (workflow subject = Petra Novak, who is not pre-completed by the
  seed; strangers pinned to genuinely unrelated employees).
- Typecheck clean.

## Known limitations / follow-ups
- Neutral/semantic colours and the Founders Grotesk webfont licence remain provisional
  (pre-production).
- "How performance works" employee guide is in the backlog.
- Year-end deliberately excluded from the scoring-button treatment: it shows assembled
  scores and narrative, not per-item 1..5 selection, so the pattern does not apply.
- Descriptive label for the averaged annual performance score remains a future policy
  decision (scores shown numerically).

## Next
Release v0.6 — Review Cycle & Year Management. Begins after this sign-off.
