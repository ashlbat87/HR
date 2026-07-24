// Dashboard read-queries (v0.7). Separate from workflow mutations. Stage definitions are
// derived from the ACTUAL per-type workflow: quarterly has no acknowledgement step;
// values acknowledges but stays COMPLETE; year-end archives on acknowledge.
import { prisma } from "@/shared/lib/prisma";
import type { ReviewType, ReviewStatus } from "@prisma/client";

export type StageKey = "self_review" | "awaiting_manager" | "awaiting_ack" | "done";

export interface StageCount {
  key: StageKey;
  label: string;
  count: number;
}

export interface ReviewTypeStatus {
  type: ReviewType;
  typeLabel: string;
  total: number;
  completed: number;
  completionPct: number; // 0..100, rounded
  stages: StageCount[]; // only the stages this type actually has
  outstanding: number; // total not-done
  bottleneck: string | null; // factual, derived from the largest outstanding stage
}

// HR-facing labels. Quarterly cycles are labelled per their cycle label (e.g. "Q2 2026")
// at the call site; this is the generic type name.
const TYPE_LABEL: Record<ReviewType, string> = {
  QUARTERLY: "Quarterly Review",
  ANNUAL_VALUES: "Values Review",
  YEAR_END: "Year-End Review",
} as any;

const STAGE_LABEL: Record<StageKey, string> = {
  self_review: "Employee self-review",
  awaiting_manager: "Manager review",
  awaiting_ack: "Awaiting acknowledgement",
  done: "Done",
};

// Which stages each review type actually has (derived from the workflow).
function stagesForType(type: ReviewType): StageKey[] {
  if (type === "QUARTERLY") return ["self_review", "awaiting_manager", "done"];
  // ANNUAL_VALUES and YEAR_END both have an acknowledgement step.
  return ["self_review", "awaiting_manager", "awaiting_ack", "done"];
}

// Classify one review into a stage, per its type's rules.
function classify(type: ReviewType, status: ReviewStatus, acknowledgedAt: Date | null): StageKey {
  if (status === "NOT_STARTED" || status === "IN_PROGRESS") return "self_review";
  if (status === "SUBMITTED" || status === "AWAITING_MANAGER" || status === "REOPENED") return "awaiting_manager";
  // From here status is COMPLETE or ARCHIVED.
  if (type === "QUARTERLY") return "done"; // no ack step
  if (type === "YEAR_END") return status === "ARCHIVED" ? "done" : "awaiting_ack";
  // ANNUAL_VALUES: acknowledged (acknowledgedAt set) = done, else awaiting ack.
  return acknowledgedAt ? "done" : "awaiting_ack";
}

// For a given period, summarise each review type that has reviews in it.
export async function getPeriodStatusSummary(periodId: string): Promise<ReviewTypeStatus[]> {
  const reviews = await prisma.review.findMany({
    where: { cycle: { periodId } },
    select: { type: true, status: true, acknowledgedAt: true },
  });

  const byType = new Map<ReviewType, { total: number; counts: Record<StageKey, number> }>();
  for (const r of reviews) {
    let bucket = byType.get(r.type);
    if (!bucket) {
      bucket = { total: 0, counts: { self_review: 0, awaiting_manager: 0, awaiting_ack: 0, done: 0 } };
      byType.set(r.type, bucket);
    }
    bucket.total++;
    bucket.counts[classify(r.type, r.status, r.acknowledgedAt)]++;
  }

  const out: ReviewTypeStatus[] = [];
  for (const [type, bucket] of byType) {
    const keys = stagesForType(type);
    const stages: StageCount[] = keys.map((k) => ({ key: k, label: STAGE_LABEL[k], count: bucket.counts[k] }));
    const completed = bucket.counts.done;
    const outstanding = bucket.total - completed;
    // Bottleneck = the outstanding (non-done) stage with the largest count.
    const outstandingStages = stages.filter((s) => s.key !== "done" && s.count > 0);
    outstandingStages.sort((a, b) => b.count - a.count);
    const top = outstandingStages[0];
    const bottleneck = top ? `Main bottleneck: ${top.count} at ${top.label.toLowerCase()}` : null;
    out.push({
      type,
      typeLabel: TYPE_LABEL[type] ?? type,
      total: bucket.total,
      completed,
      completionPct: bucket.total ? Math.round((completed / bucket.total) * 100) : 0,
      stages,
      outstanding,
      bottleneck,
    });
  }
  // Stable order: Quarterly, Values, Year-End.
  const ORDER: ReviewType[] = ["QUARTERLY", "ANNUAL_VALUES", "YEAR_END"] as any;
  out.sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  return out;
}
// ---- Filtered reviews for drill-down / click-through (v0.7). ----
// Uses the SAME classify() rules as the summary so list counts always match the
// dashboard numbers. Stage filtering is done in code (not raw SQL) to keep the per-type
// logic identical and avoid divergence.

export interface ReviewListItem {
  id: string;
  type: ReviewType;
  typeLabel: string;
  status: ReviewStatus;
  stage: StageKey;
  employeeName: string;
  managerName: string | null;
  acknowledgedAt: Date | null;
}

export interface ReviewFilters {
  periodId?: string;
  type?: ReviewType;
  stage?: StageKey;
}

export async function getFilteredReviews(filters: ReviewFilters): Promise<ReviewListItem[]> {
  const reviews = await prisma.review.findMany({
    where: {
      ...(filters.periodId ? { cycle: { periodId: filters.periodId } } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    },
    select: {
      id: true,
      type: true,
      status: true,
      acknowledgedAt: true,
      employee: { select: { displayName: true } },
      manager: { select: { displayName: true } },
    },
    orderBy: [{ type: "asc" }, { employee: { displayName: "asc" } }],
  });

  const items: ReviewListItem[] = reviews.map((r) => ({
    id: r.id,
    type: r.type,
    typeLabel: TYPE_LABEL[r.type] ?? r.type,
    status: r.status,
    stage: classify(r.type, r.status, r.acknowledgedAt),
    employeeName: r.employee?.displayName ?? "Unknown",
    managerName: r.manager?.displayName ?? null,
    acknowledgedAt: r.acknowledgedAt,
  }));

  return filters.stage ? items.filter((i) => i.stage === filters.stage) : items;
}

// ---- Setup issues (data quality). Active employees only. ----

export interface SetupIssueEmployee {
  id: string;
  displayName: string;
  workEmail: string;
}

export async function getEmployeesMissingManager(): Promise<SetupIssueEmployee[]> {
  return prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE", managerId: null, reports: { none: {} } },
    select: { id: true, displayName: true, workEmail: true },
    orderBy: { displayName: "asc" },
  });
}

export async function getEmployeesMissingGuide(): Promise<SetupIssueEmployee[]> {
  return prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE", ratingGuideCategory: null },
    select: { id: true, displayName: true, workEmail: true },
    orderBy: { displayName: "asc" },
  });
}