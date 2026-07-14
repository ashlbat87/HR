"use server";

import { getCurrentUser } from "@/core/auth";
import { revalidatePath } from "next/cache";
import {
  createQuarterlyReviewsForCycle,
  saveEmployeeDraft,
  submitReview,
  managerOpen,
  returnToEmployee,
  saveManagerDraft,
  managerComplete,
  reopenReview,
  closeReview,
  WorkflowError,
  type QuarterlyItem,
} from "@/modules/performance/review-workflow";
import { isHR } from "@/core/access";

type ActionResult = { ok: true } | { error: string };

async function run(fn: () => Promise<void>, revalidate?: string): Promise<ActionResult> {
  try {
    await fn();
    if (revalidate) revalidatePath(revalidate);
    return { ok: true };
  } catch (e) {
    if (e instanceof WorkflowError) return { error: e.message };
    console.error("review action failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

interface RatingInput {
  item: QuarterlyItem;
  score: number;
  comment?: string;
}

export async function createCycleReviewsAction(cycleId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isHR(user)) return { error: "HR access required." };
  return run(async () => {
    await createQuarterlyReviewsForCycle(cycleId, user);
  }, "/reviews");
}

export async function saveEmployeeDraftAction(
  reviewId: string,
  ratings: RatingInput[],
  narrative: { okrContribution?: string; developmentAction?: string; employeeReflection?: string }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await saveEmployeeDraft(reviewId, user, { ratings, ...narrative });
  }, "/reviews/" + reviewId);
}

export async function submitReviewAction(reviewId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await submitReview(reviewId, user);
  }, "/reviews/" + reviewId);
}

export async function managerOpenAction(reviewId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await managerOpen(reviewId, user);
  }, "/reviews/" + reviewId);
}

export async function returnToEmployeeAction(reviewId: string, reason?: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await returnToEmployee(reviewId, user, reason);
  }, "/reviews/" + reviewId);
}

export async function saveManagerDraftAction(
  reviewId: string,
  ratings: RatingInput[],
  developmentAction?: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await saveManagerDraft(reviewId, user, { ratings, developmentAction });
  }, "/reviews/" + reviewId);
}

export async function managerCompleteAction(reviewId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await managerComplete(reviewId, user);
  }, "/reviews/" + reviewId);
}

export async function reopenReviewAction(reviewId: string, reason: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await reopenReview(reviewId, user, reason);
  }, "/reviews/" + reviewId);
}

export async function closeReviewAction(reviewId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await closeReview(reviewId, user);
  }, "/reviews/" + reviewId);
}

export async function submitWithDraftAction(
  reviewId: string,
  ratings: RatingInput[],
  narrative: { okrContribution?: string; developmentAction?: string; employeeReflection?: string }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await saveEmployeeDraft(reviewId, user, { ratings, ...narrative });
    await submitReview(reviewId, user);
  }, "/reviews/" + reviewId);
}

export async function completeWithDraftAction(
  reviewId: string,
  ratings: RatingInput[],
  developmentAction?: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  return run(async () => {
    await saveManagerDraft(reviewId, user, { ratings, developmentAction });
    await managerComplete(reviewId, user);
  }, "/reviews/" + reviewId);
}
