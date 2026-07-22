// Stage 4 / Release v0.5 acceptance harness — Year-End Summary.
// Drives the real workflow functions against the real DB with fabricated
// per-role sessions. Sets up a completed quarterly review and a completed
// values review for the test employee, then exercises the year-end rules.
// Run: npm run db:reset && npx tsx scripts/stage4-acceptance.ts

import { prisma } from "../src/shared/lib/prisma";
import type { AuthUser } from "../src/core/auth";
import {
  canViewReview,
  createQuarterlyReviewsForCycle,
  saveEmployeeDraft,
  submitReview,
  managerOpen,
  saveManagerDraft,
  managerComplete,
  createValuesReviewsForCycle,
  saveEmployeeValuesDraft,
  submitValuesReview,
  saveManagerValuesDraft,
  managerCompleteValues,
  createYearEndReviewsForCycle,
  assembleYearEndData,
  saveEmployeeYearEndDraft,
  submitYearEndReview,
  saveManagerYearEndDraft,
  managerCompleteYearEnd,
  acknowledgeYearEnd,
  reopenArchivedYearEnd,
  QUARTERLY_ITEMS,
  VALUES_ITEMS,
  WorkflowError,
} from "../src/modules/performance/review-workflow";

type Result = { name: string; expected: string; actual: string; pass: boolean };
const results: Result[] = [];
function record(r: Result) {
  results.push(r);
  console.log(`\n[${r.pass ? "PASS" : "FAIL"}] ${r.name}`);
  console.log(`  Expected: ${r.expected}`);
  console.log(`  Actual:   ${r.actual}`);
}

async function asUser(email: string): Promise<AuthUser> {
  const e = await prisma.employee.findUniqueOrThrow({ where: { workEmail: email }, include: { roleAssignments: true } });
  return { employeeId: e.id, email: e.workEmail, displayName: e.displayName, roles: e.roleAssignments.map((r) => r.role) };
}
async function cycle(type: string) {
  return prisma.reviewCycle.findFirstOrThrow({ where: { type: type as any, isOpen: true } });
}
async function reviewFor(email: string, type: string) {
  const emp = await prisma.employee.findUniqueOrThrow({ where: { workEmail: email } });
  return prisma.review.findFirstOrThrow({ where: { employeeId: emp.id, type: type as any } });
}
async function timeline(reviewId: string) {
  const evs = await prisma.reviewEvent.findMany({ where: { reviewId }, orderBy: { at: "asc" } });
  return evs.map((e) => e.type);
}
const qRatings = (base: number) => QUARTERLY_ITEMS.map((item, i) => ({ item, score: ((base + i) % 5) + 1 }));
const vRatings = (base: number) => VALUES_ITEMS.map((item, i) => ({ item, score: ((base + i) % 5) + 1 }));

const EMP = "p.novak@example.test";
const MGR = "s.park@example.test";
const HR = "wafa@example.test";

// Drive a quarterly review to COMPLETE for the employee; returns its score.
async function completeQuarterly(emp: AuthUser, mgr: AuthUser): Promise<number> {
  const r = await reviewFor(EMP, "QUARTERLY");
  await saveEmployeeDraft(r.id, emp, { ratings: qRatings(0) });
  await submitReview(r.id, emp);
  await managerOpen(r.id, mgr);
  await saveManagerDraft(r.id, mgr, { ratings: qRatings(2) });
  await managerComplete(r.id, mgr);
  const done = await prisma.review.findUniqueOrThrow({ where: { id: r.id } });
  return done.quarterlyScore!;
}
async function completeValues(emp: AuthUser, mgr: AuthUser) {
  const r = await reviewFor(EMP, "ANNUAL_VALUES");
  await saveEmployeeValuesDraft(r.id, emp, { ratings: vRatings(0) });
  await submitValuesReview(r.id, emp);
  await managerOpen(r.id, mgr);
  await saveManagerValuesDraft(r.id, mgr, { ratings: vRatings(2) });
  await managerCompleteValues(r.id, mgr);
}

async function main() {
  console.log("=== Stage 4 / v0.5 acceptance tests (Year-End Summary) ===");
  const hr = await asUser(HR);
  const emp = await asUser(EMP);
  const mgr = await asUser(MGR);

  // Create all three review sets.
  await createQuarterlyReviewsForCycle((await cycle("QUARTERLY")).id, hr);
  await createValuesReviewsForCycle((await cycle("ANNUAL_VALUES")).id, hr);

  // TEST 1 — idempotent year-end creation.
  try {
    const yeCycle = await cycle("YEAR_END");
    const first = await createYearEndReviewsForCycle(yeCycle.id, hr);
    const second = await createYearEndReviewsForCycle(yeCycle.id, hr);
    const total = await prisma.review.count({ where: { cycleId: yeCycle.id, type: "YEAR_END" } });
    record({ name: "1. Year-end creation is idempotent", expected: "2nd run creates 0; total stable", actual: `1st=${first.created}, 2nd=${second.created}, total=${total}`, pass: second.created === 0 && total === first.created });
  } catch (e: any) { record({ name: "1. Year-end creation is idempotent", expected: "-", actual: "threw: " + e.message, pass: false }); }

  // Prerequisites: complete Marco's quarterly and (later) values.
  const qScore = await completeQuarterly(emp, mgr);
  const ye = await reviewFor(EMP, "YEAR_END");

  // TEST 2 — assembly: annual score = mean of completed quarters only; N of 4.
  try {
    const data = await assembleYearEndData(emp.employeeId);
    const pass = data.annualPerformanceScore === qScore && data.quartersCompleted === 1;
    record({ name: "2. Assembly: annual score = mean of completed quarters, N of 4 correct", expected: `score=${qScore}, quartersCompleted=1`, actual: `score=${data.annualPerformanceScore}, quartersCompleted=${data.quartersCompleted}`, pass });
  } catch (e: any) { record({ name: "2. Assembly", expected: "-", actual: "threw: " + e.message, pass: false }); }

  // TEST 3 — employee cannot submit without self-assessment (mandatory narrative).
  try {
    let blocked = false;
    try { await submitYearEndReview(ye.id, emp); } catch (e) { if (e instanceof WorkflowError) blocked = true; }
    record({ name: "3. Employee submit blocked without self-assessment", expected: "blocked", actual: blocked ? "blocked" : "NOT blocked", pass: blocked });
  } catch (e: any) { record({ name: "3. Employee submit gate", expected: "-", actual: "threw: " + e.message, pass: false }); }

  // Employee completes self-assessment and submits.
  await saveEmployeeYearEndDraft(ye.id, emp, { employeeOverallAssessment: "A good year." });
  await submitYearEndReview(ye.id, emp);
  await managerOpen(ye.id, mgr);

  // TEST 4 — manager cannot complete before values review is complete (Decision 2).
  try {
    await saveManagerYearEndDraft(ye.id, mgr, { managerOverallAssessment: "Strong.", developmentPlan: "Grow scope." });
    let blocked = false;
    try { await managerCompleteYearEnd(ye.id, mgr); } catch (e) { if (e instanceof WorkflowError) blocked = true; }
    record({ name: "4. Manager complete blocked until values review complete", expected: "blocked (values not yet complete)", actual: blocked ? "blocked" : "NOT blocked", pass: blocked });
  } catch (e: any) { record({ name: "4. Values-complete gate", expected: "-", actual: "threw: " + e.message, pass: false }); }

  // Now complete the values review, then completion should succeed.
  await completeValues(emp, mgr);

  // TEST 5 — manager cannot complete without development plan (mandatory narrative).
  try {
    await saveManagerYearEndDraft(ye.id, mgr, { managerOverallAssessment: "Strong.", developmentPlan: "" });
    let blocked = false;
    try { await managerCompleteYearEnd(ye.id, mgr); } catch (e) { if (e instanceof WorkflowError) blocked = true; }
    record({ name: "5. Manager complete blocked without development plan", expected: "blocked", actual: blocked ? "blocked" : "NOT blocked", pass: blocked });
  } catch (e: any) { record({ name: "5. Development plan gate", expected: "-", actual: "threw: " + e.message, pass: false }); }

  // TEST 6 — successful completion stores numeric score, no label field exists.
  try {
    await saveManagerYearEndDraft(ye.id, mgr, { managerOverallAssessment: "Strong year.", areasForGrowth: "Depth.", developmentPlan: "Lead a service." });
    await managerCompleteYearEnd(ye.id, mgr);
    const done: any = await prisma.review.findUniqueOrThrow({ where: { id: ye.id } });
    const noLabelField = !("annualPerformanceLabel" in done) && done.annualPerformanceScore !== null;
    record({ name: "6. Completion stores numeric score only (no label persisted)", expected: `status COMPLETE, numeric score set, no label field`, actual: `status=${done.status}, score=${done.annualPerformanceScore}, labelFieldAbsent=${noLabelField}`, pass: done.status === "COMPLETE" && noLabelField });
  } catch (e: any) { record({ name: "6. Numeric-only completion", expected: "-", actual: "threw: " + e.message, pass: false }); }

  // TEST 7 — acknowledge archives (COMPLETE -> ARCHIVED) and records both events.
  try {
    await acknowledgeYearEnd(ye.id, emp);
    const done = await prisma.review.findUniqueOrThrow({ where: { id: ye.id } });
    const evs = await timeline(ye.id);
    const pass = done.status === "ARCHIVED" && evs.includes("ACKNOWLEDGED") && evs.includes("ARCHIVED");
    record({ name: "7. Acknowledge archives the summary (read-only terminal state)", expected: "status ARCHIVED; ACKNOWLEDGED + ARCHIVED events", actual: `status=${done.status}; events=${evs.join(",")}`, pass });
  } catch (e: any) { record({ name: "7. Archive on acknowledge", expected: "-", actual: "threw: " + e.message, pass: false }); }

  // TEST 8 — non-HR cannot reopen an archived year-end; HR can.
  try {
    let refused = false;
    try { await reopenArchivedYearEnd(ye.id, mgr, "try"); } catch (e) { if (e instanceof WorkflowError) refused = true; }
    await reopenArchivedYearEnd(ye.id, hr, "HR reopen for correction");
    const done = await prisma.review.findUniqueOrThrow({ where: { id: ye.id } });
    record({ name: "8. Only HR can reopen an archived year-end", expected: "manager refused; HR reopens to REOPENED", actual: `managerRefused=${refused}; status=${done.status}`, pass: refused && done.status === "REOPENED" });
  } catch (e: any) { record({ name: "8. HR-only reopen", expected: "-", actual: "threw: " + e.message, pass: false }); }

  // TEST 9 — unrelated employee cannot view the year-end (forged URL).
  try {
    const strangerUser = await asUser("j.silva@example.test");
    const full = await prisma.review.findUniqueOrThrow({ where: { id: ye.id } });
    const canView = canViewReview(strangerUser, full);
    record({ name: "9. Unrelated employee cannot access the year-end summary", expected: "canView=false", actual: `canView=${canView}`, pass: canView === false });
  } catch (e: any) { record({ name: "9. Access control", expected: "-", actual: "threw: " + e.message, pass: false }); }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== SUMMARY: ${passed}/${results.length} passed ===`);
  for (const r of results) console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}

main().catch(async (e) => { console.error("Harness crashed:", e); await prisma.$disconnect(); process.exit(1); });