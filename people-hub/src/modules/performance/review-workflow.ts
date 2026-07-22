// Stage 2 — Quarterly Review workflow.
// State machine, timeline events, and score calculation for quarterly reviews.
// Scope: quarterly flow ONLY.

import { prisma } from "@/shared/lib/prisma";
import { recordAudit } from "@/core/audit";
import type { AuthUser } from "@/core/auth";
import { isHR } from "@/core/access";
import type { ReviewStatus, ReviewEventType, RaterSide, ReviewType } from "@prisma/client";

export const QUARTERLY_ITEMS = ["IMPACT", "QUALITY", "DELIVERY"] as const;
export type QuarterlyItem = (typeof QUARTERLY_ITEMS)[number];

export class WorkflowError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "WorkflowError";
  }
}

const TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  NOT_STARTED: ["IN_PROGRESS"],
  IN_PROGRESS: ["IN_PROGRESS", "SUBMITTED"],
  SUBMITTED: ["AWAITING_MANAGER", "IN_PROGRESS"],
  AWAITING_MANAGER: ["COMPLETE", "IN_PROGRESS"],
  COMPLETE: ["REOPENED", "ARCHIVED"],
  REOPENED: ["AWAITING_MANAGER", "COMPLETE"],
  ARCHIVED: ["REOPENED"],
};

function assertTransition(from: ReviewStatus, to: ReviewStatus) {
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new WorkflowError("Illegal transition: " + from + " -> " + to);
  }
}

async function recordEvent(reviewId: string, type: ReviewEventType, actor: AuthUser, detail?: string) {
  await prisma.reviewEvent.create({
    data: {
      reviewId,
      type,
      actorId: actor.employeeId,
      actorName: actor.displayName,
      detail: detail ?? undefined,
    },
  });
}

const AUDITED: ReviewEventType[] = ["REOPENED", "CLOSED", "SUBMITTED", "ACKNOWLEDGED"];

async function recordEventAndMaybeAudit(reviewId: string, type: ReviewEventType, actor: AuthUser, detail?: string) {
  await recordEvent(reviewId, type, actor, detail);
  if (AUDITED.includes(type)) {
    await recordAudit({
      actorEmail: actor.email,
      action: "review." + type.toLowerCase(),
      entityType: "Review",
      entityId: reviewId,
      detail: detail ?? undefined,
    });
  }
}

function isReviewEmployee(user: AuthUser, review: { employeeId: string }) {
  return user.employeeId === review.employeeId;
}
function isReviewManager(user: AuthUser, review: { managerId: string }) {
  return user.employeeId === review.managerId;
}

export function canViewReview(user: AuthUser, review: { employeeId: string; managerId: string }): boolean {
  return isReviewEmployee(user, review) || isReviewManager(user, review) || isHR(user);
}

export async function createQuarterlyReviewsForCycle(cycleId: string, actor: AuthUser): Promise<{ created: number; skipped: number }> {
  const cycle = await prisma.reviewCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new WorkflowError("Cycle not found.");
  if (cycle.type !== "QUARTERLY") throw new WorkflowError("This cycle is not a quarterly cycle.");

  const employees = await prisma.employee.findMany({
    where: { managerId: { not: null }, employmentStatus: "ACTIVE" },
    select: { id: true, managerId: true },
  });

  let created = 0;
  let skipped = 0;

  for (const emp of employees) {
    const existing = await prisma.review.findFirst({
      where: { cycleId, employeeId: emp.id, type: "QUARTERLY" },
    });
    if (existing) {
      skipped++;
      continue;
    }
    const review = await prisma.review.create({
      data: {
        cycleId,
        type: "QUARTERLY",
        employeeId: emp.id,
        managerId: emp.managerId!,
        status: "NOT_STARTED",
      },
    });
    await recordEvent(review.id, "CREATED", actor);
    created++;
  }

  await recordAudit({
    actorEmail: actor.email,
    action: "review.create_batch",
    entityType: "ReviewCycle",
    entityId: cycleId,
    detail: "created=" + created + ", skipped=" + skipped,
  });

  return { created, skipped };
}

interface EmployeeDraft {
  ratings: { item: QuarterlyItem; score: number; comment?: string }[];
  okrContribution?: string;
  developmentAction?: string;
  employeeReflection?: string;
}

export async function saveEmployeeDraft(reviewId: string, actor: AuthUser, draft: EmployeeDraft): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (!isReviewEmployee(actor, review)) throw new WorkflowError("Only the review's employee can save this draft.");
  if (!["NOT_STARTED", "IN_PROGRESS"].includes(review.status)) throw new WorkflowError("Draft can only be saved while in progress.");

  await upsertRatings(reviewId, "EMPLOYEE", draft.ratings);
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: "IN_PROGRESS",
      okrContribution: draft.okrContribution ?? undefined,
      developmentAction: draft.developmentAction ?? undefined,
      employeeReflection: draft.employeeReflection ?? undefined,
    },
  });
  await recordEvent(reviewId, "DRAFT_SAVED", actor);
}

export async function submitReview(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (!isReviewEmployee(actor, review)) throw new WorkflowError("Only the review's employee can submit.");
  assertTransition(review.status, "SUBMITTED");

  const selfScores = await prisma.reviewRating.count({ where: { reviewId, side: "EMPLOYEE" } });
  if (selfScores < QUARTERLY_ITEMS.length) throw new WorkflowError("Please score all items before submitting.");

  await prisma.review.update({ where: { id: reviewId }, data: { status: "SUBMITTED" } });
  await recordEventAndMaybeAudit(reviewId, "SUBMITTED", actor);
}

export async function managerOpen(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (!isReviewManager(actor, review)) throw new WorkflowError("Only the review's manager can open it.");
  if (review.status === "SUBMITTED") {
    assertTransition(review.status, "AWAITING_MANAGER");
    await prisma.review.update({ where: { id: reviewId }, data: { status: "AWAITING_MANAGER" } });
    await recordEvent(reviewId, "MANAGER_OPENED", actor);
  }
}

export async function returnToEmployee(reviewId: string, actor: AuthUser, reason?: string): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (!isReviewManager(actor, review)) throw new WorkflowError("Only the review's manager can return it.");
  if (!["SUBMITTED", "AWAITING_MANAGER"].includes(review.status)) throw new WorkflowError("Only a submitted review can be returned.");
  await prisma.review.update({ where: { id: reviewId }, data: { status: "IN_PROGRESS" } });
  await recordEvent(reviewId, "RETURNED", actor, reason);
}

interface ManagerDraft {
  ratings: { item: QuarterlyItem; score: number; comment?: string }[];
  developmentAction?: string;
}

export async function saveManagerDraft(reviewId: string, actor: AuthUser, draft: ManagerDraft): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (!isReviewManager(actor, review)) throw new WorkflowError("Only the review's manager can save manager scores.");
  if (!["AWAITING_MANAGER", "REOPENED"].includes(review.status)) throw new WorkflowError("Manager scores can only be saved after opening.");

  await upsertRatings(reviewId, "MANAGER", draft.ratings);
  if (draft.developmentAction !== undefined) {
    await prisma.review.update({ where: { id: reviewId }, data: { developmentAction: draft.developmentAction } });
  }
  await recordEvent(reviewId, "DRAFT_SAVED", actor);
}

export async function managerComplete(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (!isReviewManager(actor, review)) throw new WorkflowError("Only the review's manager can complete it.");
  if (!["AWAITING_MANAGER", "REOPENED"].includes(review.status)) throw new WorkflowError("Review is not awaiting manager completion.");

  const managerScores = await prisma.reviewRating.findMany({ where: { reviewId, side: "MANAGER" } });
  if (managerScores.length < QUARTERLY_ITEMS.length) throw new WorkflowError("Please score all items before completing.");

  const score = calculateQuarterlyScore(managerScores.map((r) => r.score));

  await prisma.review.update({ where: { id: reviewId }, data: { status: "COMPLETE", quarterlyScore: score } });
  await recordEvent(reviewId, "MANAGER_COMPLETED", actor);
}

export async function reopenReview(reviewId: string, actor: AuthUser, reason: string): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (!isReviewManager(actor, review) && !isHR(actor)) throw new WorkflowError("Only the manager or HR can reopen a review.");
  assertTransition(review.status, "REOPENED");
  if (!reason?.trim()) throw new WorkflowError("A reason is required to reopen.");
  await prisma.review.update({ where: { id: reviewId }, data: { status: "REOPENED" } });
  await recordEventAndMaybeAudit(reviewId, "REOPENED", actor, reason);
}

export async function closeReview(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (!isReviewManager(actor, review) && !isHR(actor)) throw new WorkflowError("Only the manager or HR can close a review.");
  if (review.status !== "COMPLETE") throw new WorkflowError("Only a completed review can be closed.");
  await recordEventAndMaybeAudit(reviewId, "CLOSED", actor);
}

export function calculateQuarterlyScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(mean * 10) / 10;
}

export async function getVisibleTimeline(reviewId: string, viewer: AuthUser, review: { employeeId: string; managerId: string }) {
  const events = await prisma.reviewEvent.findMany({ where: { reviewId }, orderBy: { at: "asc" } });
  const viewerIsEmployeeOnly = isReviewEmployee(viewer, review) && !isReviewManager(viewer, review) && !isHR(viewer);
  if (viewerIsEmployeeOnly) {
    return events.filter((e) => e.type !== "MANAGER_OPENED");
  }
  return events;
}

async function getReviewOrThrow(reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new WorkflowError("Review not found.");
  return review;
}

async function upsertRatings(reviewId: string, side: RaterSide, ratings: { item: QuarterlyItem; score: number; comment?: string }[]) {
  for (const r of ratings) {
    if (r.score < 1 || r.score > 5) throw new WorkflowError("Score for " + r.item + " must be between 1 and 5.");
    await prisma.reviewRating.upsert({
      where: { reviewId_side_item: { reviewId, side, item: r.item } },
      create: { reviewId, side, item: r.item, score: r.score, comment: r.comment ?? null },
      update: { score: r.score, comment: r.comment ?? null },
    });
  }
}

// =============================================================================
// STAGE 3 — Annual Values Review (Option 2: thin wrappers reusing shared
// internals above). The state machine, permission helpers, timeline/audit
// plumbing, upsertRatings, and the mean calculation are all reused unchanged.
// Only the item set, the cycle type, and the target score field differ.
// =============================================================================

// The four Tarabut values scored in an annual values review.
export const VALUES_ITEMS = [
  "INNOVATE_WITH_IMPACT",
  "DRIVE_EXCEPTIONAL_RESULTS",
  "DELIVER_VALUE_TO_CUSTOMERS",
  "WIN_COLLECTIVELY",
] as const;
export type ValuesItem = (typeof VALUES_ITEMS)[number];

// Human-readable labels for the four values (for UI and anchors lookup).
export const VALUES_LABELS: Record<ValuesItem, string> = {
  INNOVATE_WITH_IMPACT: "Innovate with Impact",
  DRIVE_EXCEPTIONAL_RESULTS: "Drive Exceptional Results",
  DELIVER_VALUE_TO_CUSTOMERS: "Deliver Value to Customers",
  WIN_COLLECTIVELY: "Win Collectively",
};

// Create annual values reviews for every eligible employee in an open
// ANNUAL_VALUES cycle. Same shape as createQuarterlyReviewsForCycle; reuses the
// same recordEvent/audit. Idempotent. HR only (enforced by caller).
export async function createValuesReviewsForCycle(
  cycleId: string,
  actor: AuthUser
): Promise<{ created: number; skipped: number }> {
  const cycle = await prisma.reviewCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new WorkflowError("Cycle not found.");
  if (cycle.type !== "ANNUAL_VALUES")
    throw new WorkflowError("This cycle is not an annual values cycle.");

  const employees = await prisma.employee.findMany({
    where: { managerId: { not: null }, employmentStatus: "ACTIVE" },
    select: { id: true, managerId: true },
  });

  let created = 0;
  let skipped = 0;
  for (const emp of employees) {
    const existing = await prisma.review.findFirst({
      where: { cycleId, employeeId: emp.id, type: "ANNUAL_VALUES" },
    });
    if (existing) {
      skipped++;
      continue;
    }
    const review = await prisma.review.create({
      data: {
        cycleId,
        type: "ANNUAL_VALUES",
        employeeId: emp.id,
        managerId: emp.managerId!,
        status: "NOT_STARTED",
      },
    });
    await recordEvent(review.id, "CREATED", actor);
    created++;
  }

  await recordAudit({
    actorEmail: actor.email,
    action: "review.create_batch",
    entityType: "ReviewCycle",
    entityId: cycleId,
    detail: `values created=${created}, skipped=${skipped}`,
  });
  return { created, skipped };
}

// Save the employee's values draft: four per-value scores + optional per-value
// comments + optional overall reflection. Reuses upsertRatings + recordEvent.
export async function saveEmployeeValuesDraft(
  reviewId: string,
  actor: AuthUser,
  draft: {
    ratings: { item: ValuesItem; score: number; comment?: string }[];
    employeeReflection?: string;
  }
): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "ANNUAL_VALUES")
    throw new WorkflowError("Not an annual values review.");
  if (!isReviewEmployee(actor, review))
    throw new WorkflowError("Only the review's employee can save this draft.");
  if (!["NOT_STARTED", "IN_PROGRESS"].includes(review.status))
    throw new WorkflowError("Draft can only be saved while in progress.");

  await upsertRatings(reviewId, "EMPLOYEE", draft.ratings as any);
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: "IN_PROGRESS",
      employeeReflection: draft.employeeReflection ?? undefined,
    },
  });
  await recordEvent(reviewId, "DRAFT_SAVED", actor);
}

// Submit the employee's values review. Requires all four value scores.
export async function submitValuesReview(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "ANNUAL_VALUES")
    throw new WorkflowError("Not an annual values review.");
  if (!isReviewEmployee(actor, review))
    throw new WorkflowError("Only the review's employee can submit.");
  assertTransition(review.status, "SUBMITTED");

  const selfScores = await prisma.reviewRating.count({
    where: { reviewId, side: "EMPLOYEE" },
  });
  if (selfScores < VALUES_ITEMS.length)
    throw new WorkflowError("Please score all four values before submitting.");

  await prisma.review.update({ where: { id: reviewId }, data: { status: "SUBMITTED" } });
  await recordEventAndMaybeAudit(reviewId, "SUBMITTED", actor);
}

// Save the manager's values draft: four per-value scores + optional comments.
export async function saveManagerValuesDraft(
  reviewId: string,
  actor: AuthUser,
  draft: { ratings: { item: ValuesItem; score: number; comment?: string }[] }
): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "ANNUAL_VALUES")
    throw new WorkflowError("Not an annual values review.");
  if (!isReviewManager(actor, review))
    throw new WorkflowError("Only the review's manager can save manager scores.");
  if (!["AWAITING_MANAGER", "REOPENED"].includes(review.status))
    throw new WorkflowError("Manager scores can only be saved after opening.");

  await upsertRatings(reviewId, "MANAGER", draft.ratings as any);
  await recordEvent(reviewId, "DRAFT_SAVED", actor);
}

// Manager completes the values review: mean of the four MANAGER value scores,
// written to valuesScore (NEVER quarterlyScore — performance and values stay
// separate). Reuses calculateQuarterlyScore purely as a generic mean helper.
export async function managerCompleteValues(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "ANNUAL_VALUES")
    throw new WorkflowError("Not an annual values review.");
  if (!isReviewManager(actor, review))
    throw new WorkflowError("Only the review's manager can complete it.");
  if (!["AWAITING_MANAGER", "REOPENED"].includes(review.status))
    throw new WorkflowError("Review is not awaiting manager completion.");

  const managerScores = await prisma.reviewRating.findMany({
    where: { reviewId, side: "MANAGER" },
  });
  if (managerScores.length < VALUES_ITEMS.length)
    throw new WorkflowError("Please score all four values before completing.");

  const score = calculateQuarterlyScore(managerScores.map((r) => r.score));
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "COMPLETE", valuesScore: score },
  });
  await recordEvent(reviewId, "MANAGER_COMPLETED", actor);
}

// Employee acknowledges having SEEN the completed review (a read sign-off, not
// agreement). Only available once COMPLETE. Records the ACKNOWLEDGED event
// (source of truth) and updates the denormalised pointer on Review.
export async function acknowledgeReview(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (!isReviewEmployee(actor, review))
    throw new WorkflowError("Only the review's employee can acknowledge it.");
  if (review.status !== "COMPLETE")
    throw new WorkflowError("Only a completed review can be acknowledged.");

  await recordEventAndMaybeAudit(reviewId, "ACKNOWLEDGED", actor);
  await prisma.review.update({
    where: { id: reviewId },
    data: { acknowledgedAt: new Date(), acknowledgedBy: actor.employeeId },
  });
}

// Shared reopen/close/return/managerOpen already work for any review type
// (they are type-agnostic), so annual values reviews reuse them directly.

// =============================================================================
// STAGE 4 / v0.5 — Year-End Summary. Reuses the shared state machine, timeline,
// audit, permissions, and acknowledgement. New: assembly of quarterly + values
// data, the four narrative fields, values-complete gate, and archive-on-acknowledge.
// =============================================================================

// Assemble an employee's completed quarterly reviews and compute the annual
// performance score (average of their quarterlyScore values). Numeric only — no
// label is computed or stored (Decision 5). Returns the score, the contributing
// quarter count, and the per-quarter rows for display.
export async function assembleYearEndData(employeeId: string) {
  const quarters = await prisma.review.findMany({
    where: { employeeId, type: "QUARTERLY", status: { in: ["COMPLETE", "ARCHIVED"] } },
    include: { cycle: true, ratings: true },
    orderBy: { cycle: { label: "asc" } },
  });
  const scores = quarters
    .map((q) => q.quarterlyScore)
    .filter((s): s is number => s !== null);
  const annualPerformanceScore =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

  // The completed annual values review for this employee (official values score).
  const valuesReview = await prisma.review.findFirst({
    where: { employeeId, type: "ANNUAL_VALUES" },
    orderBy: { createdAt: "desc" },
  });

  return {
    quarters,
    quartersCompleted: scores.length,
    annualPerformanceScore,
    valuesReview,
    valuesScore: valuesReview?.valuesScore ?? null,
    valuesComplete: valuesReview?.status === "COMPLETE" || valuesReview?.status === "ARCHIVED",
  };
}

// Create YEAR_END reviews for every eligible employee in an open YEAR_END cycle.
// Idempotent. HR only (enforced by caller). One per employee per cycle (Decision 4).
export async function createYearEndReviewsForCycle(
  cycleId: string,
  actor: AuthUser
): Promise<{ created: number; skipped: number }> {
  const cycle = await prisma.reviewCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new WorkflowError("Cycle not found.");
  if (cycle.type !== "YEAR_END") throw new WorkflowError("This cycle is not a year-end cycle.");

  const employees = await prisma.employee.findMany({
    where: { managerId: { not: null }, employmentStatus: "ACTIVE" },
    select: { id: true, managerId: true },
  });

  let created = 0;
  let skipped = 0;
  for (const emp of employees) {
    const existing = await prisma.review.findFirst({
      where: { cycleId, employeeId: emp.id, type: "YEAR_END" },
    });
    if (existing) {
      skipped++;
      continue;
    }
    const review = await prisma.review.create({
      data: { cycleId, type: "YEAR_END", employeeId: emp.id, managerId: emp.managerId!, status: "NOT_STARTED" },
    });
    await recordEvent(review.id, "CREATED", actor);
    created++;
  }
  await recordAudit({
    actorEmail: actor.email,
    action: "review.create_batch",
    entityType: "ReviewCycle",
    entityId: cycleId,
    detail: `year-end created=${created}, skipped=${skipped}`,
  });
  return { created, skipped };
}

// Employee saves their year-end self-assessment draft.
export async function saveEmployeeYearEndDraft(
  reviewId: string,
  actor: AuthUser,
  draft: { employeeOverallAssessment?: string }
): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "YEAR_END") throw new WorkflowError("Not a year-end summary.");
  if (!isReviewEmployee(actor, review)) throw new WorkflowError("Only the employee can save this draft.");
  if (!["NOT_STARTED", "IN_PROGRESS"].includes(review.status))
    throw new WorkflowError("Draft can only be saved while in progress.");
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "IN_PROGRESS", employeeOverallAssessment: draft.employeeOverallAssessment ?? undefined },
  });
  await recordEvent(reviewId, "DRAFT_SAVED", actor);
}

// Employee submits: requires the Employee Overall Self-Assessment (Decision 1).
export async function submitYearEndReview(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "YEAR_END") throw new WorkflowError("Not a year-end summary.");
  if (!isReviewEmployee(actor, review)) throw new WorkflowError("Only the employee can submit.");
  assertTransition(review.status, "SUBMITTED");
  if (!review.employeeOverallAssessment || !review.employeeOverallAssessment.trim())
    throw new WorkflowError("Please complete your overall self-assessment before submitting.");
  await prisma.review.update({ where: { id: reviewId }, data: { status: "SUBMITTED" } });
  await recordEventAndMaybeAudit(reviewId, "SUBMITTED", actor);
}

// Manager saves their year-end draft (assessment, areas for growth, development plan).
export async function saveManagerYearEndDraft(
  reviewId: string,
  actor: AuthUser,
  draft: { managerOverallAssessment?: string; areasForGrowth?: string; developmentPlan?: string }
): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "YEAR_END") throw new WorkflowError("Not a year-end summary.");
  if (!isReviewManager(actor, review)) throw new WorkflowError("Only the manager can save manager sections.");
  if (!["AWAITING_MANAGER", "REOPENED"].includes(review.status))
    throw new WorkflowError("Manager sections can only be saved after opening.");
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      managerOverallAssessment: draft.managerOverallAssessment ?? undefined,
      areasForGrowth: draft.areasForGrowth ?? undefined,
      developmentPlan: draft.developmentPlan ?? undefined,
    },
  });
  await recordEvent(reviewId, "DRAFT_SAVED", actor);
}

// Manager completes: requires Manager Overall Assessment + Development Plan
// (Decision 1); blocked unless the values review is complete (Decision 2); computes
// and stores the numeric annualPerformanceScore (Decision 5 — no label).
export async function managerCompleteYearEnd(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "YEAR_END") throw new WorkflowError("Not a year-end summary.");
  if (!isReviewManager(actor, review)) throw new WorkflowError("Only the manager can complete it.");
  if (!["AWAITING_MANAGER", "REOPENED"].includes(review.status))
    throw new WorkflowError("Review is not awaiting manager completion.");
  if (!review.managerOverallAssessment || !review.managerOverallAssessment.trim())
    throw new WorkflowError("Please complete the Manager Overall Assessment before completing.");
  if (!review.developmentPlan || !review.developmentPlan.trim())
    throw new WorkflowError("Please complete the Development Plan before completing.");

  const data = await assembleYearEndData(review.employeeId);
  if (!data.valuesComplete)
    throw new WorkflowError("The Annual Values Review must be completed before this year-end summary can be completed.");

  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "COMPLETE", annualPerformanceScore: data.annualPerformanceScore },
  });
  await recordEvent(reviewId, "MANAGER_COMPLETED", actor);
}

// Employee acknowledges a completed year-end summary; this triggers ARCHIVED
// (Additional requirement 1). Records ACKNOWLEDGED then ARCHIVED, sets the pointer.
export async function acknowledgeYearEnd(reviewId: string, actor: AuthUser): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "YEAR_END") throw new WorkflowError("Not a year-end summary.");
  if (!isReviewEmployee(actor, review)) throw new WorkflowError("Only the employee can acknowledge it.");
  if (review.status !== "COMPLETE") throw new WorkflowError("Only a completed review can be acknowledged.");

  await recordEventAndMaybeAudit(reviewId, "ACKNOWLEDGED", actor);
  await prisma.review.update({
    where: { id: reviewId },
    data: { acknowledgedAt: new Date(), acknowledgedBy: actor.employeeId, status: "ARCHIVED" },
  });
  await recordEventAndMaybeAudit(reviewId, "ARCHIVED", actor);
}

// HR reopens an archived year-end summary (only HR). Returns it to REOPENED.
export async function reopenArchivedYearEnd(reviewId: string, actor: AuthUser, reason: string): Promise<void> {
  const review = await getReviewOrThrow(reviewId);
  if (review.type !== "YEAR_END") throw new WorkflowError("Not a year-end summary.");
  if (!isHR(actor)) throw new WorkflowError("Only HR can reopen an archived year-end summary.");
  if (review.status !== "ARCHIVED") throw new WorkflowError("Only an archived review can be reopened this way.");
  assertTransition(review.status, "REOPENED");
  await prisma.review.update({ where: { id: reviewId }, data: { status: "REOPENED" } });
  await recordEventAndMaybeAudit(reviewId, "REOPENED", actor, reason);
}
// ---- Review Period management (v0.6). HR-only governance actions. ----

export async function createReviewPeriod(label: string, actor: AuthUser): Promise<{ id: string }> {
  if (!isHR(actor)) throw new WorkflowError("Only HR can create a review period.");
  if (!label?.trim()) throw new WorkflowError("A label is required for the review period.");
  const anyCurrent = await prisma.reviewPeriod.findFirst({ where: { isCurrent: true } });
  const period = await prisma.reviewPeriod.create({
    data: { label: label.trim(), isCurrent: !anyCurrent },
  });
  await recordAudit({ actorEmail: actor.email, action: "period.create", entityType: "ReviewPeriod", entityId: period.id, detail: "label=" + period.label });
  return { id: period.id };
}

export async function setCurrentPeriod(periodId: string, actor: AuthUser): Promise<void> {
  if (!isHR(actor)) throw new WorkflowError("Only HR can set the current review period.");
  const period = await prisma.reviewPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new WorkflowError("Review period not found.");
  if (period.status === "COMPLETED") throw new WorkflowError("A completed period cannot be made current.");
  await prisma.$transaction([
    prisma.reviewPeriod.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
    prisma.reviewPeriod.update({ where: { id: periodId }, data: { isCurrent: true } }),
  ]);
  await recordAudit({ actorEmail: actor.email, action: "period.set_current", entityType: "ReviewPeriod", entityId: periodId, detail: "label=" + period.label });
}

export async function openCycleInPeriod(
  periodId: string,
  type: ReviewType,
  label: string,
  actor: AuthUser,
  deadlines?: { employeeDeadline?: Date | null; managerDeadline?: Date | null }
): Promise<{ id: string }> {
  if (!isHR(actor)) throw new WorkflowError("Only HR can open a cycle.");
  if (!label?.trim()) throw new WorkflowError("A label is required for the cycle.");
  const period = await prisma.reviewPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new WorkflowError("Review period not found.");
  if (period.status === "COMPLETED") throw new WorkflowError("Cannot open a cycle in a completed period.");
  const cycle = await prisma.reviewCycle.create({
    data: {
      type,
      label: label.trim(),
      isOpen: true,
      periodId,
      employeeDeadline: deadlines?.employeeDeadline ?? null,
      managerDeadline: deadlines?.managerDeadline ?? null,
    },
  });
  await recordAudit({ actorEmail: actor.email, action: "cycle.open_in_period", entityType: "ReviewCycle", entityId: cycle.id, detail: "type=" + type + ", period=" + period.label });
  return { id: cycle.id };
}

export async function completeReviewPeriod(
  periodId: string,
  actor: AuthUser
): Promise<{ ok: true } | { ok: false; outstanding: { reviewId: string; employeeId: string; type: ReviewType; status: ReviewStatus }[] }> {
  if (!isHR(actor)) throw new WorkflowError("Only HR can complete a review period.");
  const period = await prisma.reviewPeriod.findUnique({ where: { id: periodId }, include: { cycles: true } });
  if (!period) throw new WorkflowError("Review period not found.");
  if (period.status === "COMPLETED") throw new WorkflowError("This period is already completed.");
  const cycleIds = period.cycles.map((c) => c.id);
  const outstanding = cycleIds.length
    ? await prisma.review.findMany({
        where: { cycleId: { in: cycleIds }, status: { notIn: ["COMPLETE", "ARCHIVED"] } },
        select: { id: true, employeeId: true, type: true, status: true },
      })
    : [];
  if (outstanding.length > 0) {
    return { ok: false, outstanding: outstanding.map((r) => ({ reviewId: r.id, employeeId: r.employeeId, type: r.type, status: r.status })) };
  }
  await prisma.$transaction([
    prisma.reviewPeriod.update({ where: { id: periodId }, data: { status: "COMPLETED", isCurrent: false, closedAt: new Date() } }),
    prisma.reviewCycle.updateMany({ where: { periodId }, data: { isOpen: false } }),
  ]);
  await recordAudit({ actorEmail: actor.email, action: "period.complete", entityType: "ReviewPeriod", entityId: periodId, detail: "label=" + period.label + ", cycles=" + cycleIds.length });
  return { ok: true };
}