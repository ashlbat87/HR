# Release v0.8 (Stage 7) — Reporting & Insights (HR Insights Hub): Design Note (rev 3, UX FROZEN)

Status: UX FROZEN (approved by Ash). Implementation may proceed. After this rev, no
further UX redesign unless testing identifies a genuine usability issue; focus is
implementation quality, performance, testing, accessibility, and documentation.
Companion: v0.9 will add Moderation & Calibration on this foundation.

## 0. Design philosophy
v0.8 is not a collection of reports; it is an HR Insights Hub. Opening it, HR should
immediately understand: what happened, where the interesting patterns are, where HR may
wish to investigate, and which report answers the next question. Calm, premium,
insightful, and consistent with the Tarabut People Hub design system. The tool surfaces
patterns in neutral language; HR interprets. Performance and values are always separate.

## 1. Purpose and HR user outcomes
Give HR the analytical picture operational screens do not. Outcomes: an executive overview
before any chart; separate performance and values distributions; ratings relative to the
organisation and (where data exists) prior cycles; self-vs-manager gaps; department,
function and manager comparisons; manager participation/follow-through; drill-down from
any figure to the underlying reviews with a clear path; exportable reports.

## 2. Scope and exclusions
IN: executive summaries (rule-based, not AI); performance and values distributions;
self-vs-manager gaps; department/function/manager comparisons; completion/participation
and cycle-over-cycle trends where data exists; Manager Accountability View; drill-down
with breadcrumb; CSV export (architecture ready for Excel/PDF).
OUT (explicitly): any moderation/calibration workflow (v0.9); changing any rating;
composite/blended performance+values figures; manager-quality scores; league tables;
AI-generated summaries (space reserved, not built); predictions.

## 3. Information architecture
A Reporting & Insights area (HR-only), the fourth nav item. Landing page hierarchy:
  Executive Summary  ->  Key Highlights  ->  Explore Reports (report cards)  ->  Future AI
  Summary (reserved space only, at the bottom so it never interrupts the reading flow).
Each report opens its own view that also begins with an Executive Summary (for that
report), then filters, chart/table, neutral signals, drill-down (with breadcrumb), and
export. Every reporting page header shows two context elements: a "Last refreshed"
timestamp (see 12a) and a "Filters applied" summary (see 12b). Manager Accountability is a
peer report, kept visually and conceptually separate from rating reports.

## 4. Report catalogue (framed as HR's questions)
- How are performance ratings distributed?
- How are values ratings distributed?
- Where do employees and managers see performance differently? (self-vs-manager gaps)
- Which departments differ from the organisation?
- Which functions differ from the organisation? (rating-guide category)
- How do rating distributions vary by manager?
- How complete is the current process? (completion & participation)
- How are managers participating and following through? (Manager Accountability)

## 5. Executive Summary (rule-based, deterministic, NOT AI)
Every reporting page opens with a concise summary generated from metrics and the
configurable Insight Rules (section 5a), in neutral language. Landing page = org-wide
summary; each report = a summary scoped to that report. Every Executive Summary answers
three questions, in this order:
- What happened? (factual state) e.g. "Performance ratings remain concentrated at
  Advanced."; "The average manager rating is 3.6."
- What should HR know? (notable patterns) e.g. "Employee self-ratings remain 0.4 higher
  than manager ratings."; "One department differs from the organisational average."
- What should HR do? (a bounded, rule-triggered recommendation) drawn from a FIXED set of
  phrases, never free-form and never naming an individual, e.g. "No immediate
  investigation is recommended."; "Department comparison may warrant further review.";
  "Review manager participation before calibration."
The "what should HR do" line is deterministic: each phrase maps to a specific Insight Rule
being crossed (mapping documented in the Metric Dictionary). When no rule is crossed, it
reads "No immediate investigation is recommended." No AI is used anywhere in the summary.

## 5a. Insight Rules (configurable, single source of truth)
Executive Summary thresholds are NOT hard-coded. They live in one Insight Rules
configuration object that the reporting engine consumes, so thresholds evolve without
edits scattered through the codebase. Rules (with documented default values, tunable and
owned by Ash):
- ratingConcentrationThresholdPp = 15 (a group's % at 4-5 exceeds org by more than this
  many percentage points).
- selfManagerGapThreshold = 0.75 (average self-manager gap exceeds this).
- departmentVarianceThreshold = 0.5 (a department's average differs from org by more than
  this).
- managerVarianceThreshold = 0.5 (a manager's average differs from org by more than this).
Each crossed rule contributes a "what should HR do" phrase. The config is typed and lives
in one module; reporting/summary code reads it, never embeds literals.

## 6. Performance reporting
Distribution of official performance ratings (1..5, RATING_LABELS) across the filtered
population. Count and % per level, average, % at 4-5, % at 1-2, difference from org, and
difference from previous cycle where data exists. Executive summary + neutral signals.

## 7. Values reporting
Same shape, computed on values ratings, on a separate view. Never combined with
performance; no composite; no combined distribution.

## 8. Self-vs-manager gap reporting ("Where do employees and managers see performance differently?")
Per review, gap = official/manager rating - employee self-rating (performance; values
separately where a self-score exists). Reports average gap, gap-size distribution
(|gap| = 0, 1, 2+), and difference from the org average gap. Factual framing only.

## 9. Department and function comparisons
Distributions/averages by department and by rating-guide category, each compared to org in
neutral terms. NO population-size suppression in v0.8 (see section 15).

## 10. Manager-level distributions
Distribution/average of official ratings by manager, % at 4-5, difference from org.
Neutral language; never labels a manager. Drill-down to the manager's underlying reviews.

## 11. Manager Accountability View (participation/process only)
Separate view. Measures: reviews awaiting each manager; completion percentage; median
review completion time (where timestamps support it, else "not available"); reopened
reviews; trends over time where data exists. Rationale for median: completion % alone
hides employee experience (100% at 3 days vs 100% at 42 days are very different).
Guardrails: NO manager performance score; NO league table; NO punitive labels; NO AI
judgement; show context and trends; drill into the underlying reviews. Visually and
conceptually distinct from rating calibration.

## 12. Filters, drill-down, and the navigation path
Common filters: period, cycle/review type, department, function, manager. Every figure
drills to the underlying reviews. A breadcrumb always shows position, e.g.:
  Reporting & Insights > Performance distribution > Engineering > Advanced > Employees.
Drill-down reuses the v0.7 filtered-browser pattern where possible.

## 12a. Last refreshed
Every reporting page header shows when the data was generated, e.g. "Last refreshed:
24 July 2026, 09:15 GST". Driven from the reporting layer: in v0.8, reports read live from
the database on load, so the timestamp is the server generation time of the current view
(there is no separate cache in v0.8; if caching/scheduled refreshes are added later, the
same field reflects them). Formatted in GST. Purpose: confidence the data is current.

## 12b. Filters applied
Whenever a report is filtered, a concise, always-visible summary of the active filters is
shown in the header, e.g. Review Year: 2026; Review Cycle: Q2; Review Type: Performance;
Department: Engineering. It stays visible while viewing the report and is included in
exported reports (as header rows) so screenshots, exports, and discussions always carry
the correct context.

## 13. Export requirements
An export abstraction (format-agnostic report export) is designed so CSV, Excel, and PDF
summary can all be supported. v0.8 implements CSV (performance and values in separate
columns/exports, never composite; filter context noted). Excel/PDF are future formats that
slot into the same abstraction without redesign.

## 14. Permissions
HR/HR Admin only, guarded server-side (redirect non-HR). Managers/employees have no access
to org-wide reporting in v0.8. Drill-down and exports reuse existing access rules.

## 15. Privacy and sensitivity controls
- Population-size suppression is NOT applied in v0.8, by deliberate decision. Rationale:
  Reporting & Insights is strictly HR-only, and HR is already authorised to view
  individual employee data; suppressing small departments/functions/managers would reduce
  usefulness (calibration often needs small teams) without adding real protection. This is
  a considered decision, not an oversight.
- However, suppression is built as a DORMANT, permission-configurable capability (a
  minimum-group-size rule) defaulted OFF for HR. If Reporting is ever extended beyond HR
  users, the rule can be enabled and configured then, without redesign.
- Rating data remains sensitive personal data; reporting stays HR-only and exports are an
  HR action treated as sensitive. No cross-border movement introduced; all computation is
  server-side on existing data.
- Population size shown for context: wherever an organisational comparison or group figure
  is displayed, the underlying count is shown ("based on N reviews"). This gives HR the
  confidence context that suppression would have hidden, without hiding any data.

## 16. Neutral-language standards
Factual observations only. Allowed: "a larger proportion of ratings fall at 4-5 than the
organisational average"; "the employee-manager gap is wider than the organisational
average"; "this pattern may warrant further review". Forbidden: inflated ratings, lenient/
strict manager, biased department, or any misconduct/quality judgement. The platform
supports HR judgement, it does not replace it.

## 17. Empty states and small-population handling
- No completed ratings for a filter: "No completed ratings match these filters yet."
- Small groups: shown normally (no suppression in v0.8); every comparison shows "based on
  N reviews" so HR can judge confidence in a small-population figure.
- Trends with one period only: "Not enough history yet for a trend" (queries built; honest
  empty state until multiple periods exist).
- Zero groups matching: friendly empty state, not an error.

## 18. Future AI readiness (reserved, not built)
A defined slot in the page layout is reserved where a future AI Summary panel could appear
(e.g. "ratings are consistent with previous cycles"; "Engineering shows a wider spread
than the organisation"; "self-ratings remain higher than manager ratings"). v0.8 renders
nothing there (or a subtle "future" placeholder at most); no AI is built. The rule-based
Executive Summary is separate and remains the v0.8 feature.

## 19. How v0.8 prepares for v0.9 (without building it)
- A single "official rating" resolver feeds all reports: today returns the manager rating;
  v0.9 returns the approved moderated rating when one exists, with NO change to reporting.
- Reporting queries shaped so v0.9 can report original vs moderated side by side.
- Data model untouched by v0.8 (read-only reporting); v0.9 adds the moderation layer
  (original preserved, moderated added, reason/actor/date/session/audit) without
  disturbing v0.8 reads.
- Manager Accountability populations reusable by v0.9 calibration.

## 20. Acceptance criteria
1. Reporting & Insights is HR-only; non-HR redirected.
2. Landing page hierarchy is Executive Summary -> Key Highlights -> Explore Reports.
3. Each report opens with a rule-based Executive Summary answering "what happened / what
   should HR know / what should HR do", the last from a fixed phrase set tied to Insight
   Rules; neutral language; no AI.
4. Performance and values render separately; no combined/composite figure anywhere.
5. Distribution reports show count/%, average, % at 4-5, difference from org, and diff from
   previous cycle where data exists.
6. Self-vs-manager gap report shows average gap and gap-size distribution, neutrally.
7. Department, function, and manager comparisons render for ALL group sizes (no
   suppression); every comparison figure shows "based on N reviews".
8. Manager Accountability shows reviews awaiting, completion %, median completion time,
   reopened, and trends where data exists; guardrails honoured; drills to reviews.
9. Every figure drills to the underlying reviews, with a breadcrumb showing the path.
10. CSV export works with filters applied, keeping performance/values separate; export
    abstraction is format-agnostic (Excel/PDF ready).
11. A reserved AI-summary slot exists at the BOTTOM of the landing page but renders no AI
    in v0.8.
12. Neutral language throughout; no judgemental labels.
13. All rating metrics computed via the official-rating resolver (manager rating today).
14. Regressions: Stage 2 6/6, Stage 3 6/6, Stage 4 9/9, Stage 5 9/9 still pass; typecheck
    clean.
15. Executive Summary thresholds come from a single configurable Insight Rules object, not
    hard-coded literals.
16. Every reporting page header shows a "Last refreshed" (GST) timestamp from the reporting
    layer and a "Filters applied" summary; the filter summary is included in CSV exports.

## 21. Regression risks
- Read-only reporting, so workflow risk is low; main risk is mis-classifying ratings.
  Mitigate with a checked resolver and a reporting acceptance harness (counts vs seed;
  separation; gap math; median-time math; executive-summary threshold triggers).
- Performance/values separation must hold in every report and export; test explicitly.
- The official-rating resolver must return the manager rating today (v0.9 seam unused);
  test it does.
- Drill-down reuse must not regress the v0.7 browse page.

## Staging (each behind a stop-and-approve gate)
- 7a: reporting query layer (official-rating resolver; distribution, gap, group-comparison
  with population counts, accountability incl. median time; Insight Rules config; the
  three-question executive-summary rule engine consuming that config) + a reporting
  acceptance harness (counts vs seed; separation; gap and median math; each Insight Rule's
  trigger; population-count correctness). Gate.
- 7b: Reporting & Insights landing (Executive Summary -> Key Highlights -> Explore Reports)
  + performance and values distribution views (exec summary, filters, neutral signals,
  empty states, reserved AI slot). Gate.
- 7c: self-vs-manager gaps + department/function/manager comparisons (breadcrumb
  drill-down). Gate.
- 7d: Manager Accountability View (incl. median completion time). Gate.
- 7e: export abstraction + CSV implementation + drill-down wiring across reports. Gate.
- 7f: closing docs (acceptance, changelog, release history, approvals), roadmap/journal
  updates for the v0.8/v0.9 split, and sign-off.
