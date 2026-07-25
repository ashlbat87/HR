# v0.8 Reporting & Insights — Metric Dictionary (rev 3, UX frozen)

All rating metrics use the "official rating" resolver (today = manager rating; v0.9 =
approved moderated rating when one exists). Performance and values are computed and
reported separately; never combined or composite. Ratings use RATING_LABELS {1 Poor,
2 Base, 3 Intermediate, 4 Advanced, 5 Rock Star}. All metrics scoped by active filters
(period, cycle/type, department, function, manager). No population-size suppression in
v0.8 (HR-only; see design section 15).

## Population and scoping
- Population: reviews matching the current filters that have an official (manager) rating.
  Incomplete reviews are excluded from rating distributions but counted in completion.
- Official rating: resolver output per review (manager rating today).
- Function: employee rating-guide category (ENGINEERING, SALES_COMMERCIAL, PRODUCT,
  OPERATIONS, SUPPORT_FUNCTIONS).

## Rating distribution metrics (separate for performance and values)
- Count per level; percent per level; average (1 dp); % at 4-5; % at 1-2.
- Difference from organisation: population figure minus org-wide figure for the same type.
- Difference from previous cycle: versus prior comparable cycle where data exists; else
  "not enough history yet".

## Self-vs-manager gap metrics (performance; values where a self-score exists)
- Gap (per review): official/manager rating minus employee self-rating (can be negative).
- Average gap (1 dp); gap-size distribution: count/% with |gap| = 0, 1, 2+.
- Difference from org average gap (neutral wording).

## Group comparison metrics (department, function, manager)
- Per group: population size (true n), average official rating, % at 4-5, % at 1-2,
  difference from org distribution.
- Population size ("based on N reviews") is displayed alongside every organisational
  comparison or group figure, so HR can judge confidence. This replaces suppression:
  data is never hidden; its basis is always shown.
- No suppression in v0.8. See "Population-size rule" below.

## Completion and participation metrics
- Completion rate: reviews done / total in scope (v0.7 stage-aware "done" per type).
- Outstanding by stage: self-review, awaiting manager, awaiting acknowledgement.
- Trend: across cycles/periods where more than one exists; else honest empty state.

## Manager Accountability metrics (participation/process only — NOT quality)
- Reviews awaiting this manager: count at awaiting-manager stage for the manager's reports.
- Completion percentage: manager's reports' reviews done / total.
- Median review completion time: median of (manager-complete time minus awaiting-manager
  time) across the manager's completed reviews, where timestamps support it; else "not
  available". Median (not mean) to resist outlier distortion. Rationale: two managers can
  both be 100% complete with very different medians (e.g. 3 days vs 42 days); median
  surfaces the employee-experience difference completion % hides.
- Reopened reviews: count reopened (manager or HR) among the manager's reviews.
- Trends over time: the above across cycles where data exists.
- Explicitly NOT computed: manager-quality score, ranking, or judgement.

## Insight Rules (configurable thresholds — single source of truth)
Executive Summary logic reads these from one typed configuration object; no literals are
embedded in reporting code. Defaults (tunable, owned by Ash):
- ratingConcentrationThresholdPp = 15  (group % at 4-5 exceeds org by > this many pp)
- selfManagerGapThreshold = 0.75       (average self-manager gap exceeds this)
- departmentVarianceThreshold = 0.5    (department average differs from org by > this)
- managerVarianceThreshold = 0.5       (manager average differs from org by > this)

## Executive Summary structure (three questions; rule-based; NOT AI)
Every summary answers, in order:
1. What happened? — factual state (e.g. "Performance ratings remain concentrated at
   Advanced."; "The average manager rating is 3.6.").
2. What should HR know? — notable patterns (e.g. "Employee self-ratings remain 0.4 higher
   than manager ratings."; "One department differs from the organisational average.").
3. What should HR do? — a bounded, rule-triggered recommendation from a FIXED phrase set,
   never free-form, never naming an individual. Mapping (rule crossed -> phrase):
   - none crossed -> "No immediate investigation is recommended."
   - departmentVarianceThreshold crossed -> "Department comparison may warrant further
     review."
   - managerVarianceThreshold crossed -> "Manager distribution may warrant further review."
   - selfManagerGapThreshold crossed -> "Self and manager ratings may warrant further
     review."
   - ratingConcentrationThresholdPp crossed -> "Rating concentration may warrant further
     review."
   - (Manager Accountability context) outstanding manager participation -> "Review manager
     participation before calibration."
   Multiple crossed rules -> multiple phrases, each neutral and bounded.
When none are crossed the summary is honest: it states the facts and "No immediate
investigation is recommended." No individual/manager/department is ever named as a problem.

## Population-size rule (dormant in v0.8)
No suppression applied for HR. A minimum-group-size suppression capability is built but
defaulted OFF and permission-gated, so it can be enabled/configured if Reporting is ever
extended beyond HR users. Decision rationale recorded in design section 15 (HR-only +
already-authorised = suppression protects nothing while reducing usefulness).

## Page context elements
- Last refreshed: server generation time of the current view, formatted in GST (e.g.
  "24 July 2026, 09:15 GST"). v0.8 reads live on load, so this is the generation time;
  the same field reflects any future cache/scheduled refresh.
- Filters applied: the active filters (Review Year, Cycle, Type, Department, Function,
  Manager as set), shown in the header and written into CSV export header rows so exported
  data always carries its scoping context.

## Neutral-language rule (every metric's narrative)
Factual only. Allowed: "higher than the organisation distribution", "a larger proportion
at 4-5", "gap wider than the organisation average", "this pattern may warrant review".
Never: inflated, lenient/strict manager, biased, misconduct, poor quality.
