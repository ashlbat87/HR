# Reporting & Insights — Time Scoping Design Note (APPROVED)

Status: APPROVED. Fixes a foundational gap: reports previously scoped silently to the
"current" period and pooled all cycles within it, with no way to choose a timeframe and no
clarity on quarter-vs-year. This note defines explicit, user-controlled time scoping.
Recorded as Product Decisions; existing reports are retrofitted before new reports are built.

## 1. The problem
- No visibility: users could not tell precisely which timeframe a report covered.
- No control: reports always showed the current period; no way to view a past quarter.
- Wrong unit: reports scoped to the PERIOD and pooled every cycle, so a "performance
  distribution" silently mixed Q1..Q4 rather than showing one quarter.
- Dimension/frequency mismatch: performance runs up to four quarterly cycles per period;
  values may run once or twice a year. Pooling hid this.

## 2. Core model: period, cycle, dimension
A ReviewPeriod (e.g. "2026") contains ReviewCycles; each cycle has a type (QUARTERLY |
ANNUAL_VALUES | YEAR_END) and a label. Reporting scopes to a CYCLE by default (one quarter
for performance; one values cycle for values), with an opt-in to widen to the whole PERIOD
(full year). The default unit of analysis is one cycle, not the whole period. Reporting is
limited to QUARTERLY (performance) and ANNUAL_VALUES (values); YEAR_END is excluded.

## 3. The selector (first-class filter)
A visible scope selector at the top of every report — a FIRST-CLASS FILTER, not a status
label. It clearly shows the current selection AND makes alternative timeframes discoverable
and switchable (a real control, styled and placed as a primary filter). It offers:
- Timeframe: a specific cycle (e.g. "Q2 2026") OR "Full year 2026".
- Only cycles that exist for the report's dimension (performance reports show quarterly
  cycles; values reports show values cycles). No assuming four quarters for values.
The selector always states the current selection in words so the timeframe is never
ambiguous.

## 4. Defaults — the latest MEANINGFUL cycle
- Default to the latest MEANINGFUL cycle of the report's dimension in the current period,
  not simply the newest. If the newest cycle only just opened and has insufficient completed
  reviews, the default remains the latest COMPLETED cycle until the active cycle reaches a
  completion threshold.
- The completion threshold is CONFIGURABLE (owned like the Insight Rules; not hard-coded as
  a percentage). A sensible default is chosen at build time and recorded; the value is not
  baked into report code.
- Rationale: prevents defaulting to a near-empty, just-opened quarter that reads as broken.
- No cycle of that dimension -> neutral empty state.

## 5. Cross-report consistency
The selected timeframe is carried in the URL (e.g. ?cycle=<id> or ?period=<id>&scope=year)
so: moving between reports keeps the timeframe where the dimension matches; a view is
shareable/bookmarkable; drill-down inherits the exact scope so counts stay consistent.
Switching dimension (performance <-> values) resolves to that dimension's equivalent cycle.

## 6. "Full year" semantics — pooling is never silent
Choosing "Full year" pools all cycles of the dimension in the period. POOLING IS NEVER
SILENT (Product Decision): the UI explicitly states the report is based on pooled data
(e.g. "Showing: Full year 2026 — pooled across all quarterly cycles") and always makes the
timeframe, population, and dimension clear. Opt-in, never the silent default. Full year for
VALUES is offered ONLY when more than one values cycle exists in the period.

## 7. Impact on existing reports (retrofit)
- The 7a query layer already accepts { cycleId } and { periodId }; this is mostly wiring the
  selector through.
- Distribution views, comparison views, the landing summary, and drill-down move from
  "scope = current period" to "scope = selected cycle (default) or period (full year)".
- Every report shows the selected timeframe prominently and the selector.
- Counts and "based on N" reflect the chosen timeframe.

## 8. Relationship to Strategic Alignment (future)
Strategic Alignment ties OKR quarters to review periods (PD-019). An OKR quarter, a review
cycle, and a report timeframe will all speak the same language.

## 9. Acceptance criteria
1. Every report shows a clear timeframe statement and a first-class selector to change it.
2. Default = latest MEANINGFUL cycle (configurable completion threshold).
3. Performance reports offer only quarterly cycles; values reports only values cycles.
4. "Full year" pools all cycles of the dimension and says so explicitly; values full-year
   offered only when >1 values cycle exists.
5. Selection carried in the URL and inherited by drill-down (counts stay consistent).
6. Distribution and comparison reports retrofitted to honour the selected scope.
7. Regressions pass; typecheck clean.

## 10. Settled decisions
- Per-report selector, first-class filter, selection carried via URL.
- Full year for values only when >1 values cycle exists.
- Reporting limited to Performance (QUARTERLY) + Values (ANNUAL_VALUES); YEAR_END excluded.
- Default = latest meaningful cycle (configurable completion threshold, not hard-coded).
- Pooling is never silent (Product Decision).
