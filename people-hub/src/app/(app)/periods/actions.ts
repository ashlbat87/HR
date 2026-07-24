"use server";

import { getCurrentUser } from "@/core/auth";
import { revalidatePath } from "next/cache";
import {
  createReviewPeriod,
  setCurrentPeriod,
  openCycleInPeriod,
  completeReviewPeriod,
  WorkflowError,
} from "@/modules/performance/review-workflow";
import { isHR } from "@/core/access";
import type { ReviewType, ReviewStatus } from "@prisma/client";

type ActionResult = { ok: true } | { error: string };
type CompleteResult =
  | { ok: true }
  | { error: string }
  | { blocked: true; outstanding: { reviewId: string; employeeId: string; type: ReviewType; status: ReviewStatus }[] };

export async function createReviewPeriodAction(label: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isHR(user)) return { error: "HR access required." };
  try {
    await createReviewPeriod(label, user);
    revalidatePath("/periods");
    return { ok: true };
  } catch (e) {
    if (e instanceof WorkflowError) return { error: e.message };
    console.error("createReviewPeriodAction failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function setCurrentPeriodAction(periodId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isHR(user)) return { error: "HR access required." };
  try {
    await setCurrentPeriod(periodId, user);
    revalidatePath("/periods");
    return { ok: true };
  } catch (e) {
    if (e instanceof WorkflowError) return { error: e.message };
    console.error("setCurrentPeriodAction failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function openCycleInPeriodAction(periodId: string, type: ReviewType, label: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isHR(user)) return { error: "HR access required." };
  try {
    await openCycleInPeriod(periodId, type, label, user);
    revalidatePath("/periods");
    return { ok: true };
  } catch (e) {
    if (e instanceof WorkflowError) return { error: e.message };
    console.error("openCycleInPeriodAction failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function completeReviewPeriodAction(periodId: string): Promise<CompleteResult> {
  const user = await getCurrentUser();
  if (!user || !isHR(user)) return { error: "HR access required." };
  try {
    const res = await completeReviewPeriod(periodId, user);
    if (res.ok === false) {
      return { blocked: true, outstanding: res.outstanding };
    }
    revalidatePath("/periods");
    return { ok: true };
  } catch (e) {
    if (e instanceof WorkflowError) return { error: e.message };
    console.error("completeReviewPeriodAction failed:", e);
    return { error: "Something went wrong. Please try again." };
  }
}