import { prisma } from "../src/shared/lib/prisma";
import type { AuthUser } from "../src/core/auth";
import {
  canViewReview,
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
} from "../src/modules/performance/review-workflow";

type Result = { name: string; objective: string; steps: string[]; expected: string; actual: string; pass: boolean };
const results: Result[] = [];

function record(r: Result) {
  results.push(r);
  console.log("\n[" + (r.pass ? "PASS" : "FAIL") + "] " + r.name);
  console.log("  Objective: " + r.objective);
  console.log("  Steps: " + r.steps.join(" | "));
  console.log("  Expected: " + r.expected);
  console.log("  Actual:   " + r.actual);
}

async function asUser(email: string): Promise<AuthUser> {
  const e = await prisma.employee.findUniqueOrThrow({
    where: { workEmail: email },
    include: { roleAssignments: true },
  });
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
async function findOpenCycle() {
  return prisma.reviewCycle.findFirstOrThrow({ where: { type: "QUARTERLY", isOpen: true } });
}
async function reviewFor(emailEmployee: string) {
  const emp = await prisma.employee.findUniqueOrThrow({ where: { workEmail: emailEmployee } });
  return prisma.review.findFirstOrThrow({ where: { employeeId: emp.id, type: "QUARTERLY" } });
}

async function main() {
  console.log("=== Stage 2 acceptance tests ===");
  const HR = await asUser("wafa@example.test");
  const cycle = await findOpenCycle();

  {
    const first = await createQuarterlyReviewsForCycle(cycle.id, HR);
    const second = await createQuarterlyReviewsForCycle(cycle.id, HR);
    const total = await prisma.review.count({ where: { cycleId: cycle.id, type: "QUARTERLY" } });
    record({
      name: "1. Quarterly review creation is idempotent",
      objective: "Running create twice must not duplicate reviews.",
      steps: ["createQuarterlyReviewsForCycle x2 as HR", "count reviews"],
      expected: "2nd run creates 0, skips all; total equals 1st run's created.",
      actual: "1st created=" + first.created + ", 2nd created=" + second.created + ", 2nd skipped=" + second.skipped + ", total=" + total,
      pass: second.created === 0 && second.skipped === first.created && total === first.created,
    });
  }

  const marco = await asUser("m.rossi@example.test");
  const soojin = await asUser("s.park@example.test");

  {
    const rev = await reviewFor("m.rossi@example.test");
    await saveEmployeeDraft(rev.id, marco, { ratings: [{ item: "IMPACT", score: 4 }, { item: "QUALITY", score: 4 }] });
    let msg = "no error thrown";
    try { await submitReview(rev.id, marco); } catch (e) { msg = e instanceof WorkflowError ? e.message : String(e); }
    const status = (await prisma.review.findUniqueOrThrow({ where: { id: rev.id } })).status;
    record({
      name: "2. Submission blocked if a required rating is missing",
      objective: "Submitting with fewer than three self-scores must be refused.",
      steps: ["save 2 of 3 scores", "attempt submit"],
      expected: "WorkflowError about scoring all items; status not SUBMITTED.",
      actual: "error='" + msg + "', status=" + status,
      pass: msg.toLowerCase().includes("score all items") && status !== "SUBMITTED",
    });
  }

  {
    const rev = await reviewFor("m.rossi@example.test");
    await saveEmployeeDraft(rev.id, marco, { ratings: [{ item: "IMPACT", score: 4 }, { item: "QUALITY", score: 4 }, { item: "DELIVERY", score: 3 }] });
    await submitReview(rev.id, marco);
    await managerOpen(rev.id, soojin);
    await returnToEmployee(rev.id, soojin, "Please expand the reflection");
    const status = (await prisma.review.findUniqueOrThrow({ where: { id: rev.id } })).status;
    let canEdit = false;
    try { await saveEmployeeDraft(rev.id, marco, { ratings: [{ item: "IMPACT", score: 5 }] }); canEdit = true; } catch { canEdit = false; }
    const tl = await timelineTypes(rev.id);
    record({
      name: "3. Return to employee restores editing",
      objective: "Manager return must set status editable and let the employee save again.",
      steps: ["submit", "managerOpen", "returnToEmployee", "employee saves again"],
      expected: "status IN_PROGRESS; employee save succeeds; RETURNED event present.",
      actual: "status=" + status + ", employeeCanEdit=" + canEdit + ", hasRETURNED=" + tl.includes("RETURNED"),
      pass: status === "IN_PROGRESS" && canEdit && tl.includes("RETURNED"),
    });
  }

  {
    const rev = await reviewFor("m.rossi@example.test");
    await saveEmployeeDraft(rev.id, marco, { ratings: [{ item: "IMPACT", score: 4 }, { item: "QUALITY", score: 4 }, { item: "DELIVERY", score: 3 }] });
    await submitReview(rev.id, marco);
    await managerOpen(rev.id, soojin);
    await saveManagerDraft(rev.id, soojin, { ratings: [{ item: "IMPACT", score: 4 }, { item: "QUALITY", score: 3 }, { item: "DELIVERY", score: 3 }] });
    await managerComplete(rev.id, soojin);
    let emptyReasonRejected = false;
    try { await reopenReview(rev.id, soojin, "   "); } catch (e) { emptyReasonRejected = e instanceof WorkflowError; }
    await reopenReview(rev.id, soojin, "Correcting the delivery score");
    await managerComplete(rev.id, soojin);
    await closeReview(rev.id, soojin);
    const tl = await timelineTypes(rev.id);
    const audit = await auditActions(rev.id);
    record({
      name: "4. Reopen/Close require reasons and update Timeline + Audit Log",
      objective: "Reopen needs a reason; reopen and close write to both timeline and audit log.",
      steps: ["reopen blank (expect reject)", "reopen with reason", "complete", "close"],
      expected: "blank rejected; REOPENED+CLOSED in timeline; review.reopened+review.closed in audit.",
      actual: "blankRejected=" + emptyReasonRejected + ", timeline=[" + tl.join(",") + "], audit=[" + audit.join(",") + "]",
      pass: emptyReasonRejected && tl.includes("REOPENED") && tl.includes("CLOSED") && audit.includes("review.reopened") && audit.includes("review.closed"),
    });
  }

  {
    const rev = await reviewFor("m.rossi@example.test");
    const joana = await asUser("j.silva@example.test");
    const full = await prisma.review.findUniqueOrThrow({ where: { id: rev.id } });
    const joanaCanView = canViewReview(joana, full);
    const marcoCanView = canViewReview(marco, full);
    const soojinCanView = canViewReview(soojin, full);
    const hrCanView = canViewReview(HR, full);
    record({
      name: "5. Unrelated employee cannot access another's review (forged URL)",
      objective: "canViewReview refuses an unrelated employee; allows owner, manager, HR.",
      steps: ["canViewReview for Joana, Marco, Soo-jin, Wafa"],
      expected: "Joana=false; Marco=true; Soo-jin=true; HR=true.",
      actual: "Joana=" + joanaCanView + ", Marco=" + marcoCanView + ", Soojin=" + soojinCanView + ", HR=" + hrCanView,
      pass: joanaCanView === false && marcoCanView && soojinCanView && hrCanView,
    });
  }

  {
    const empCount = await prisma.employee.count();
    const guideCount = await prisma.ratingGuide.count();
    const soojinReports = await prisma.employee.findMany({ where: { managerId: soojin.employeeId } });
    const reportNames = soojinReports.map((r) => r.displayName).sort();
    record({
      name: "6. Stage 1 data-layer regression",
      objective: "Schema additions must not break Stage 1 core data.",
      steps: ["count employees", "count guides", "read Soo-jin reports"],
      expected: "employees >= 10; guides >= 1; Soo-jin has reports.",
      actual: "employees=" + empCount + ", guides=" + guideCount + ", soojinReports=[" + reportNames.join(",") + "]",
      pass: empCount >= 10 && guideCount >= 1 && soojinReports.length >= 1,
    });
  }

  const passed = results.filter((r) => r.pass).length;
  console.log("\n=== SUMMARY: " + passed + "/" + results.length + " passed ===");
  for (const r of results) console.log("  " + (r.pass ? "PASS" : "FAIL") + "  " + r.name);
  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}

main().catch(async (e) => { console.error("Harness crashed:", e); await prisma.$disconnect(); process.exit(1); });
