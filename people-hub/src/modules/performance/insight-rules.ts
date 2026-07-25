// Insight Rules — the single, configurable source of truth for Executive Summary
// thresholds (design section 5a; PD-010). The reporting/summary engine reads these; no
// threshold literals are embedded anywhere else. Change values here only. Defaults are
// owned by Ash and documented in docs/STAGE7_v0_8_METRIC_DICTIONARY.md.

export interface InsightRules {
  // A group's % at levels 4-5 exceeds the organisation's by more than this many
  // percentage points -> rating-concentration signal.
  ratingConcentrationThresholdPp: number;
  // Average self-manager gap (manager minus self) exceeds this -> gap signal.
  selfManagerGapThreshold: number;
  // A department's average official rating differs from the org average by more than this.
  departmentVarianceThreshold: number;
  // A manager's average official rating differs from the org average by more than this.
  managerVarianceThreshold: number;
}

// Documented default values (tunable). Kept as a single exported constant so the whole
// app shares one configuration. A future release could load overrides (e.g. per tenant)
// without changing any consumer, since everything reads getInsightRules().
export const DEFAULT_INSIGHT_RULES: InsightRules = {
  ratingConcentrationThresholdPp: 15,
  selfManagerGapThreshold: 0.75,
  departmentVarianceThreshold: 0.5,
  managerVarianceThreshold: 0.5,
};

// Single accessor the reporting/summary engine uses. Today returns the documented
// defaults; a future release can source overrides here with no consumer change.
export function getInsightRules(): InsightRules {
  return DEFAULT_INSIGHT_RULES;
}
