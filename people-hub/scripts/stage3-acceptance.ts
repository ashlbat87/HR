// Stage 3 acceptance test harness — Annual Values Review.
import { prisma } from "../src/shared/lib/prisma";
import type { AuthUser } from "../src/core/auth";
import { canViewReview } from "../src/modules/performance/review-workflow";
import {
  createValuesReviewsForCycle,
  saveEmployeeValuesDraft,
  submitValuesReview,
  saveManagerValuesDraft,
  managerCompleteValues,
  managerOpen,
  acknowledgeReview,
  reopenReview,
  VALUES_ITEMS,
  WorkflowError,
} from "../src/modules/performance/review-workflow";

type Result = { name: string; objective: string; steps: string[]; expected: string; actual: string; pass: boolean };
const results: Result[] = [];
function record(r: Result) {
  results.push(r);
  const tag = r.pass ? "PASS" : "FAIL";
  console.log(`\n[${tag}] ${r.name}`);
  console.log(`  Objective: ${r.objective}`);
  console.log(`  Steps: ${r.steps.join(" | ")}`);
  console.log(`  Expected: ${r.expected}`);
  console.log(`  Actual:   ${r.actual}`);
}
async function asUser(email: string): Promise<AuthUser> {
  const e = await prisma.employee.findUniqueOrThrow({ where: { workEmail: email }, include: { roleAssignments: true } });
  return { employeeId: e.id, email: e.workEmail, displayName: e.displayName, roles: e.roleAssignments.map((r) => r.role) };
}
async function timelineTypes(reviewId: string): Promise<string[]> {
  const evs = await prisma.reviewEvent.findMany({ where: { reviewId }, orderBy: { at: "asc" } });
  return evs.map((e) => e.type);
}
async function auditActions(reviewId: string): Promise<string[]> {
  const logs = await prisma.auditLog.findMany({ where: { entityType: "Review", entityId: reviewId }, orderBy: { at: "asc" } });
  return logs.map((l) => l.action);
}
async function findOpenValuesCycle() {
  return prisma.reviewCycle.findFirstOrThrow({ where: { type: "ANNUAL_VALUES", isOpen: true } });
}
async function valuesReviewFor(email: string) {
  const emp = await prisma.employee.findUniqueOrThrow({ where: { workEmail: email } });
  return prisma.review.findFirstOrThrow({ where: { employeeId: emp.id, type: "ANNUAL_VALUES" } });
}
function fourScores(base: number) {
  return VALUES_ITEMS.map((item, i) => ({ item, score: ((base + i) % 5) + 1, comment: `c${i}` }));
}
async function main() {
  console.log("=== Stage 3 acceptance tests (Annual Values Review) ===");
  const HR = await asUser("wafa@example.test");
  const cycle = await findOpenValuesCycle();
  try {
    const first = await createValuesReviewsForCycle(cycle.id, HR);
    const second = await createValuesReviewsForCycle(cycle.id, HR);
    const total = await prisma.review.count({ where: { cycleId: cycle.id, type: "ANNUAL_VALUES" } });
    const pass = second.created === 0 && second.skipped === first.created && total === first.created;
    record({ name: "1. Values review creation is idempotent", objective: "Create twice must not duplicate.", steps: ["create x2", "count"], expected: "2nd creates 0, skips all.", actual: `1st=${first.created}, 2nd=${second.created}, skip=${second.skipped}, total=${total}`, pass });
  } catch (e: any) { record({ name: "1. Values review creation is idempotent", objective: "-", steps: ["-"], expected: "-", actual: "threw: " + e.message, pass: false }); }
  const marco = await asUser("m.rossi@example.test");
  const review = await valuesReviewFor("m.rossi@example.test");
  const mgrEmp = await prisma.employee.findUniqueOrThrow({ where: { id: review.managerId } });
  const manager = await asUser(mgrEmp.workEmail);
  try {
    await saveEmployeeValuesDraft(review.id, marco, { ratings: [{ item: VALUES_ITEMS[0], score: 3 }] });
    let blocked = false;
    try { await submitValuesReview(review.id, marco); } catch (e) { if (e instanceof WorkflowError) blocked = true; }
    record({ name: "2. Submission blocked unless all four scored", objective: "Cannot submit <4 scores.", steps: ["save 1", "submit"], expected: "rejected.", actual: blocked ? "blocked" : "NOT blocked", pass: blocked });
  } catch (e: any) { record({ name: "2. Submission blocked unless all four scored", objective: "-", steps: ["-"], expected: "-", actual: "threw: " + e.message, pass: false }); }
  try {
    await saveEmployeeValuesDraft(review.id, marco, { ratings: fourScores(0), employeeReflection: "done" });
    await submitValuesReview(review.id, marco);
    await managerOpen(review.id, manager);
    await saveManagerValuesDraft(review.id, manager, { ratings: fourScores(2) });
    await managerCompleteValues(review.id, manager);
    const done = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    const mgr = fourScores(2).map((r) => r.score);
    const mean = Math.round((mgr.reduce((a, b) => a + b, 0) / 4) * 10) / 10;
    const pass = done.status === "COMPLETE" && done.valuesScore === mean && done.quarterlyScore === null;
    record({ name: "3. Values score = mean of manager scores only (never blended)", objective: "Manager scores only; quarterlyScore null.", steps: ["emp 4", "submit", "mgr 4", "complete"], expected: `COMPLETE; values=${mean}; quarterly=null`, actual: `${done.status}; values=${done.valuesScore}; quarterly=${done.quarterlyScore}`, pass });
  } catch (e: any) { record({ name: "3. Values score = mean of manager scores only", objective: "-", steps: ["-"], expected: "-", actual: "threw: " + e.message, pass: false }); }
  try {
    await acknowledgeReview(review.id, marco);
    const done = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    const events = await timelineTypes(review.id);
    const pass = events.includes("ACKNOWLEDGED") && done.acknowledgedAt !== null && done.acknowledgedBy === marco.employeeId;
    record({ name: "4. Acknowledgement records event + pointer", objective: "ACKNOWLEDGED event + pointer set.", steps: ["acknowledge", "read"], expected: "event + pointer set.", actual: `events=${events.join(",")}; at=${done.acknowledgedAt ? "set" : "null"}`, pass });
  } catch (e: any) { record({ name: "4. Acknowledgement records event + pointer", objective: "-", steps: ["-"], expected: "-", actual: "threw: " + e.message, pass: false }); }
  try {
    await reopenReview(review.id, manager, "amend after discussion");
    const events = await timelineTypes(review.id);
    const audits = await auditActions(review.id);
    const pass = events.includes("REOPENED") && audits.some((a) => a.includes("reopen"));
    record({ name: "5. Reopen logs to timeline and audit", objective: "Reopen writes timeline + audit.", steps: ["reopen", "read"], expected: "REOPENED + audit.", actual: `REOPENED=${events.includes("REOPENED")}; audit=${audits.join(",")}`, pass });
  } catch (e: any) { record({ name: "5. Reopen logs to timeline and audit", objective: "-", steps: ["-"], expected: "-", actual: "threw: " + e.message, pass: false }); }
  try {
    const stranger = await prisma.employee.findFirstOrThrow({ where: { id: { notIn: [marco.employeeId, manager.employeeId] }, workEmail: { not: "wafa@example.test" } } });
    const strangerUser = await asUser(stranger.workEmail);
    const full = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    const canView = canViewReview(strangerUser, full);
    record({ name: "6. Unrelated employee cannot access review", objective: "Deny forged URL.", steps: ["stranger", "canViewReview"], expected: "false.", actual: `canView=${canView}`, pass: canView === false });
  } catch (e: any) { record({ name: "6. Unrelated employee cannot access review", objective: "-", steps: ["-"], expected: "-", actual: "threw: " + e.message, pass: false }); }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== SUMMARY: ${passed}/${results.length} passed ===`);
  for (const r of results) console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}
main().catch(async (e) => { console.error("Harness crashed:", e); await prisma.$disconnect(); process.exit(1); });
