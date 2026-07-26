// Reporting query layer (v0.8, Stage 7a). Read-only analytics over completed reviews.
// INVARIANTS (see docs/PRODUCT_DECISIONS.md):
//  - PD-001: performance and values are computed and returned SEPARATELY, never blended.
//  - PD-002/PD-003: the "official rating" is the manager rating TODAY; getOfficialRating
//    is the single seam where v0.9 will substitute an approved moderated rating with no
//    change to any consumer here.
//  - PD-012: every aggregate is drillable; getReviewIdsForScope returns the underlying
//    review ids for any scope so callers can fetch the exact population.
// Ratings: authoritative per-item scores live in ReviewRating (1..5, side EMPLOYEE|
// MANAGER, item = IMPACT/QUALITY/DELIVERY for performance or value names for values).
// The per-review official score is the mean of the MANAGER-side item scores for the given
// dimension; the self score is the mean of EMPLOYEE-side item scores. Distribution buckets
// round the official score to a 1..5 level (round half up); averages use the precise mean.

import { prisma } from "@/shared/lib/prisma";
import type { ReviewType } from "@prisma/client";

export type RatingDimension = "PERFORMANCE" | "VALUES";

// Which review type backs each reporting dimension (kept explicit to honour PD-001).
const TYPE_FOR_DIMENSION: Record<RatingDimension, ReviewType> = {
  PERFORMANCE: "QUARTERLY" as ReviewType,
  VALUES: "ANNUAL_VALUES" as ReviewType,
};

// The items that make up each dimension's score, by convention in ReviewRating.item.
// Performance items are fixed; values items are the value names (any item on a VALUES
// review counts). We therefore filter performance to its three items, and for values we
// take all items on VALUES reviews.
const PERFORMANCE_ITEMS = ["IMPACT", "QUALITY", "DELIVERY"];

function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// A single completed review's reporting facts for a dimension.
export interface ReviewDatum {
  reviewId: string;
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  department: string | null;
  func: string | null; // rating-guide category
  managerScore: number; // mean of MANAGER-side items (precise)
  selfScore: number | null; // mean of EMPLOYEE-side items, if any
}

// The official rating for a review dimension. TODAY: the manager score. v0.9 SEAM: when an
// approved moderated rating exists, return it here; no consumer changes. (PD-002/PD-003.)
export function getOfficialScore(d: ReviewDatum): number {
  return d.managerScore;
}

// Load the completed-review population for a dimension, scoped by optional filters.
// "Completed" = has manager-side ratings for the dimension (an official score exists).
export interface ReportingScope {
  periodId?: string;
  cycleId?: string;
  department?: string;
  func?: string;
  managerId?: string;
}

export async function getReviewData(dimension: RatingDimension, scope: ReportingScope = {}): Promise<ReviewDatum[]> {
  const type = TYPE_FOR_DIMENSION[dimension];
  const reviews = await prisma.review.findMany({
    where: {
      type,
      ...(scope.cycleId ? { cycleId: scope.cycleId } : {}),
      ...(scope.periodId ? { cycle: { periodId: scope.periodId } } : {}),
    },
    select: {
      id: true,
      employeeId: true,
      managerId: true,
      employee: { select: { displayName: true, department: true, ratingGuideCategory: true } },
      manager: { select: { displayName: true } },
      ratings: { select: { side: true, item: true, score: true } },
    },
  });

  const out: ReviewDatum[] = [];
  for (const r of reviews) {
    // Code-side scope filtering (avoids nested-relation where-clauses).
    if (scope.managerId && r.managerId !== scope.managerId) continue;
    if (scope.department && (r.employee?.department ?? null) !== scope.department) continue;
    if (scope.func && String(r.employee?.ratingGuideCategory ?? "") !== scope.func) continue;

    const rel = dimension === "VALUES"
      ? (it: string) => true
      : (it: string) => PERFORMANCE_ITEMS.includes(it);
    const mgrItems = r.ratings.filter((x) => x.side === "MANAGER" && rel(x.item));
    const selfItems = r.ratings.filter((x) => x.side === "EMPLOYEE" && rel(x.item));
    const managerScore = mean(mgrItems.map((x) => x.score));
    if (managerScore == null) continue; // no official score -> not in the rated population
    const selfScore = mean(selfItems.map((x) => x.score));
    out.push({
      reviewId: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee?.displayName ?? "Unknown",
      managerId: r.managerId,
      managerName: r.manager?.displayName ?? "Unknown",
      department: r.employee?.department ?? null,
      func: r.employee?.ratingGuideCategory ? String(r.employee.ratingGuideCategory) : null,
      managerScore,
      selfScore,
    });
  }
  return out;
}
export async function getReviewIdsForScope(dimension: RatingDimension, scope: ReportingScope = {}): Promise<string[]> {
  const data = await getReviewData(dimension, scope);
  return data.map((d) => d.reviewId);
}

// Distribution over levels 1..5 (buckets by rounded official score); precise average.
export interface Distribution {
  dimension: RatingDimension;
  total: number; // population size ("based on N reviews")
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  average: number | null; // precise mean of official scores
  pctAt4or5: number; // 0..100
  pctAt1or2: number; // 0..100
}

export function computeDistribution(dimension: RatingDimension, data: ReviewDatum[]): Distribution {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  const scores: number[] = [];
  for (const d of data) {
    const off = getOfficialScore(d);
    scores.push(off);
    let lvl = roundHalfUp(off);
    if (lvl < 1) lvl = 1;
    if (lvl > 5) lvl = 5;
    counts[lvl as 1 | 2 | 3 | 4 | 5]++;
  }
  const total = data.length;
  const at45 = counts[4] + counts[5];
  const at12 = counts[1] + counts[2];
  return {
    dimension,
    total,
    counts,
    average: mean(scores),
    pctAt4or5: total ? (at45 / total) * 100 : 0,
    pctAt1or2: total ? (at12 / total) * 100 : 0,
  };
}

// Self-vs-manager gap: gap = official(manager) - self, per review that has both.
export interface GapReport {
  dimension: RatingDimension;
  total: number; // reviews with both a manager and a self score
  averageGap: number | null; // precise mean of (manager - self)
  sizeDistribution: { zero: number; one: number; twoPlus: number }; // by |rounded gap|
}

export function computeGap(dimension: RatingDimension, data: ReviewDatum[]): GapReport {
  const gaps: number[] = [];
  let zero = 0, one = 0, twoPlus = 0;
  for (const d of data) {
    if (d.selfScore == null) continue;
    const gap = getOfficialScore(d) - d.selfScore;
    gaps.push(gap);
    const mag = Math.abs(roundHalfUp(gap));
    if (mag === 0) zero++;
    else if (mag === 1) one++;
    else twoPlus++;
  }
  return {
    dimension,
    total: gaps.length,
    averageGap: mean(gaps),
    sizeDistribution: { zero, one, twoPlus },
  };
}

// ---- Group comparisons (department, function, manager) with population counts ----
// PD-007: no suppression; every group shows its true n ("based on N reviews").

export interface GroupStat {
  key: string; // department name, function (enum string), or manager id
  label: string; // display label (manager name for manager groups; key otherwise)
  n: number; // population size ("based on N reviews")
  average: number | null; // precise mean official score
  pctAt4or5: number;
  diffFromOrg: number | null; // group average minus org average (null if either empty)
}

export type GroupBy = "department" | "func" | "manager";

export function computeGroupComparison(dimension: RatingDimension, data: ReviewDatum[], groupBy: GroupBy): GroupStat[] {
  const orgAvg = mean(data.map((d) => getOfficialScore(d)));
  const groups = new Map<string, { label: string; data: ReviewDatum[] }>();
  for (const d of data) {
    let key: string | null;
    let label: string;
    if (groupBy === "department") { key = d.department; label = d.department ?? "Unassigned"; }
    else if (groupBy === "func") { key = d.func; label = d.func ?? "Unassigned"; }
    else { key = d.managerId; label = d.managerName; }
    const k = key ?? "__unassigned__";
    if (!groups.has(k)) groups.set(k, { label, data: [] });
    groups.get(k)!.data.push(d);
  }
  const out: GroupStat[] = [];
  for (const [key, g] of groups) {
    const scores = g.data.map((d) => getOfficialScore(d));
    const avg = mean(scores);
    const at45 = scores.filter((s) => roundHalfUp(s) >= 4).length;
    out.push({
      key,
      label: g.label,
      n: g.data.length,
      average: avg,
      pctAt4or5: scores.length ? (at45 / scores.length) * 100 : 0,
      diffFromOrg: avg != null && orgAvg != null ? avg - orgAvg : null,
    });
  }
  out.sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  return out;
}

// ---- Manager Accountability: median completion time (SUBMITTED -> MANAGER_COMPLETED) ----
// PD-008: participation/process only. Median completion time uses the LAST SUBMITTED
// before MANAGER_COMPLETED (the submission that led to completion). Returns null ("not
// available") where a manager has no completed reviews with both events.

export interface ManagerCompletionTime {
  managerId: string;
  managerName: string;
  completedCount: number; // reviews with both a qualifying SUBMITTED and MANAGER_COMPLETED
  medianDays: number | null;
}

export async function getManagerMedianCompletionTimes(scope: ReportingScope = {}): Promise<ManagerCompletionTime[]> {
  // Consider all review types for participation (manager work spans types).
  const reviews = await prisma.review.findMany({
    where: {
      ...(scope.cycleId ? { cycleId: scope.cycleId } : {}),
      ...(scope.periodId ? { cycle: { periodId: scope.periodId } } : {}),
      ...(scope.managerId ? { managerId: scope.managerId } : {}),
    },
    select: {
      managerId: true,
      manager: { select: { displayName: true } },
      events: { select: { type: true, at: true }, orderBy: { at: "asc" } },
    },
  });

  const byManager = new Map<string, { name: string; durationsMs: number[] }>();
  for (const r of reviews) {
    const completed = [...r.events].filter((e) => e.type === "MANAGER_COMPLETED").sort((a, b) => a.at.getTime() - b.at.getTime()).pop();
    if (!completed) continue;
    const submittedBefore = r.events
      .filter((e) => e.type === "SUBMITTED" && e.at.getTime() <= completed.at.getTime())
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .pop();
    if (!submittedBefore) continue;
    const ms = completed.at.getTime() - submittedBefore.at.getTime();
    const key = r.managerId;
    if (!byManager.has(key)) byManager.set(key, { name: r.manager?.displayName ?? "Unknown", durationsMs: [] });
    byManager.get(key)!.durationsMs.push(ms);
  }

  const out: ManagerCompletionTime[] = [];
  for (const [managerId, m] of byManager) {
    const days = m.durationsMs.map((ms) => ms / (1000 * 60 * 60 * 24));
    out.push({
      managerId,
      managerName: m.name,
      completedCount: days.length,
      medianDays: median(days),
    });
  }
  out.sort((a, b) => a.managerName.localeCompare(b.managerName));
  return out;
}

// ---- Executive Summary (three questions; rule-based; consumes Insight Rules) ----
// PD-010. Returns structured lines; the "what should HR do" phrases are a fixed, bounded
// set, each tied to a crossed Insight Rule (see docs/STAGE7_v0_8_METRIC_DICTIONARY.md).

import { getInsightRules } from "./insight-rules";

export interface ExecutiveSummary {
  whatHappened: string[];
  whatToKnow: string[];
  whatToDo: string[];
}

export interface SummaryInputs {
  dimensionLabel: string; // "Performance" | "Values" (for phrasing)
  distribution: Distribution;
  gap?: GapReport | null;
  groups?: GroupStat[] | null; // department or manager groups, for variance rules
  groupKind?: "department" | "manager" | null;
}

export function buildExecutiveSummary(inp: SummaryInputs): ExecutiveSummary {
  const rules = getInsightRules();
  const s: ExecutiveSummary = { whatHappened: [], whatToKnow: [], whatToDo: [] };
  const d = inp.distribution;

  // What happened (factual state).
  if (d.total === 0) {
    s.whatHappened.push(`No completed ${inp.dimensionLabel.toLowerCase()} ratings match these filters yet.`);
    s.whatToDo.push("No immediate investigation is recommended.");
    return s;
  }
  const avg = d.average != null ? d.average.toFixed(1) : "n/a";
  s.whatHappened.push(`${inp.dimensionLabel} ratings: average ${avg}, based on ${d.total} review${d.total === 1 ? "" : "s"}.`);
  const topLevel = ([5, 4, 3, 2, 1] as const).reduce((a, b) => (d.counts[b] > d.counts[a] ? b : a), 3 as 1 | 2 | 3 | 4 | 5);
  const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };
  s.whatHappened.push(`Most ${inp.dimensionLabel.toLowerCase()} ratings are at ${LEVEL_LABEL[topLevel]}.`);

  // What HR should know + what HR should do (rule-driven).
  let anyRule = false;

  if (inp.gap && inp.gap.averageGap != null) {
    const g = inp.gap.averageGap;
    s.whatToKnow.push(`Employee self-ratings are ${Math.abs(g).toFixed(1)} ${g >= 0 ? "lower than" : "higher than"} manager ratings on average.`);
    if (Math.abs(g) > rules.selfManagerGapThreshold) {
      anyRule = true;
      s.whatToDo.push("Self and manager ratings may warrant further review.");
    }
  }

  if (inp.groups && inp.groupKind) {
    const orgAvg = d.average;
    const threshold = inp.groupKind === "department" ? rules.departmentVarianceThreshold : rules.managerVarianceThreshold;
    const divergent = inp.groups.filter((gr) => gr.average != null && orgAvg != null && Math.abs(gr.average - orgAvg) > threshold);
    if (divergent.length > 0) {
      anyRule = true;
      s.whatToKnow.push(`${divergent.length} ${inp.groupKind}${divergent.length === 1 ? "" : "s"} differ from the organisational average.`);
      s.whatToDo.push(inp.groupKind === "department"
        ? "Department comparison may warrant further review."
        : "Manager distribution may warrant further review.");
    }
  }

  // Rating concentration vs org (only meaningful for a filtered subgroup; here we note
  // high concentration at 4-5 as an org-level observation the caller can pass through).
  if (d.pctAt4or5 >= 50) {
    s.whatToKnow.push(`A larger proportion of ratings fall at 4-5 (${Math.round(d.pctAt4or5)}%).`);
  }

  if (!anyRule) s.whatToDo.push("No immediate investigation is recommended.");
  return s;
}

// Median and mode for a distribution (rev 4 KPI strip). Median uses precise official
// scores; mode is the level (1..5) with the highest count.
export function computeMedianOfficial(data: ReviewDatum[]): number | null {
  return median(data.map((d) => getOfficialScore(d)));
}

export function computeModeLevel(dist: Distribution): (1 | 2 | 3 | 4 | 5) | null {
  if (dist.total === 0) return null;
  let best: 1 | 2 | 3 | 4 | 5 = 1;
  for (const l of [1, 2, 3, 4, 5] as const) if (dist.counts[l] > dist.counts[best]) best = l;
  return best;
}

// Drill-down: the reviews whose official score rounds to a given level, for a scope +
// dimension. Count equals the distribution bar for that level (same rounding, PD-016).
export interface DrillReview {
  reviewId: string;
  employeeName: string;
  managerName: string;
  department: string | null;
  officialScore: number;
}

export function reviewsInBucket(data: ReviewDatum[], level: number): DrillReview[] {
  const out: DrillReview[] = [];
  for (const d of data) {
    let lvl = roundHalfUp(getOfficialScore(d));
    if (lvl < 1) lvl = 1;
    if (lvl > 5) lvl = 5;
    if (lvl === level) {
      out.push({
        reviewId: d.reviewId,
        employeeName: d.employeeName,
        managerName: d.managerName,
        department: d.department,
        officialScore: getOfficialScore(d),
      });
    }
  }
  out.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  return out;
}

// Drill-down by group (department / func / manager). Returns the reviews in a group, using
// the same ReviewDatum fields the comparison view grouped on. For managers, key = managerId.
export function reviewsInGroup(data: ReviewDatum[], groupBy: GroupBy, key: string): DrillReview[] {
  const out: DrillReview[] = [];
  for (const d of data) {
    const gk = groupBy === "department" ? (d.department ?? "__unassigned__")
      : groupBy === "func" ? (d.func ?? "__unassigned__")
      : d.managerId;
    if (gk === key) {
      out.push({
        reviewId: d.reviewId,
        employeeName: d.employeeName,
        managerName: d.managerName,
        department: d.department,
        officialScore: getOfficialScore(d),
      });
    }
  }
  out.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  return out;
}
