// Stage 2 — Quarterly Review workflow.
// State machine, timeline events, and score calculation for quarterly reviews.
// Scope: quarterly flow ONLY.

import { prisma } from "@/shared/lib/prisma";
import { recordAudit } from "@/core/audit";
import type { AuthUser } from "@/core/auth";
import { isHR } from "@/core/access";
import type { ReviewStatus, ReviewEventType, RaterSide } from "@prisma/client";

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
  COMPLETE: ["REOPENED"],
  REOPENED: ["AWAITING_MANAGER", "COMPLETE"],
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

const AUDITED: ReviewEventType[] = ["REOPENED", "CLOSED", "SUBMITTED"];

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
