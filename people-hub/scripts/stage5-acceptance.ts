// Stage 5 / Release v0.6 acceptance harness — Review Cycle & Period Management.
// Run: npm run db:reset && npx tsx scripts/stage5-acceptance.ts
import { prisma } from "../src/shared/lib/prisma";
import type { AuthUser } from "../src/core/auth";
import {
  createReviewPeriod,
  setCurrentPeriod,
  openCycleInPeriod,
  completeReviewPeriod,
  createQuarterlyReviewsForCycle,
  saveEmployeeDraft,
  submitReview,
  managerOpen,
  saveManagerDraft,
  managerComplete,
  WorkflowError,
  QUARTERLY_ITEMS,
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
const qRatings = (base: number) => QUARTERLY_ITEMS.map((item, i) => ({ item, score: ((base + i) % 5) + 1 }));

async function main() {
  console.log("=== Stage 5 / v0.6 acceptance tests (Review Cycle & Period Management) ===");
  const hr = await asUser("wafa@example.test");
  const petra = await asUser("p.novak@example.test");
  const soojin = await asUser("s.park@example.test");

  const seededCurrent = await prisma.reviewPeriod.findFirstOrThrow({ where: { isCurrent: true } });

  try {
    const created = await createReviewPeriod("2027", hr);
    const currents = await prisma.reviewPeriod.count({ where: { isCurrent: true } });
    const the2027 = await prisma.reviewPeriod.findUniqueOrThrow({ where: { id: created.id } });
    const pass = currents === 1 && the2027.isCurrent === false && the2027.label === "2027";
    record({ name: "1. Create period does not steal 'current' when one exists; only one current", expected: "exactly 1 current; new 2027 not current", actual: `currents=${currents}, 2027.isCurrent=${the2027.isCurrent}`, pass });
  } catch (e: any) { record({ name: "1. Create period", expected: "-", actual: "threw: " + e.message, pass: false }); }

  try {
    const the2027 = await prisma.reviewPeriod.findFirstOrThrow({ where: { label: "2027" } });
    await setCurrentPeriod(the2027.id, hr);
    const currents = await prisma.reviewPeriod.count({ where: { isCurrent: true } });
    const reloaded2027 = await prisma.reviewPeriod.findUniqueOrThrow({ where: { id: the2027.id } });
    const reloaded2026 = await prisma.reviewPeriod.findUniqueOrThrow({ where: { id: seededCurrent.id } });
    const pass = currents === 1 && reloaded2027.isCurrent === true && reloaded2026.isCurrent === false;
    record({ name: "2. setCurrentPeriod moves current, old period stays intact", expected: "2027 current; 2026 not; exactly 1 current", actual: `currents=${currents}, 2027=${reloaded2027.isCurrent}, 2026=${reloaded2026.isCurrent}`, pass });
  } catch (e: any) { record({ name: "2. setCurrentPeriod", expected: "-", actual: "threw: " + e.message, pass: false }); }

  try {
    const the2027 = await prisma.reviewPeriod.findFirstOrThrow({ where: { label: "2027" } });
    const q = await openCycleInPeriod(the2027.id, "QUARTERLY" as any, "Q1 2027", hr);
    const v = await openCycleInPeriod(the2027.id, "ANNUAL_VALUES" as any, "Values 2027", hr);
    const y = await openCycleInPeriod(the2027.id, "YEAR_END" as any, "Year-End 2027", hr);
    const cycles = await prisma.reviewCycle.findMany({ where: { id: { in: [q.id, v.id, y.id] } } });
    const allTied = cycles.length === 3 && cycles.every((c) => c.periodId === the2027.id && c.isOpen);
    record({ name: "3. Open cycle of each type in a period; each carries periodId and is open", expected: "3 cycles tied to 2027, all open", actual: `count=${cycles.length}, allTied=${allTied}`, pass: allTied });
  } catch (e: any) { record({ name: "3. openCycleInPeriod", expected: "-", actual: "threw: " + e.message, pass: false }); }

  try {
    const done = await createReviewPeriod("ARCHIVE-TEST", hr);
    await prisma.reviewPeriod.update({ where: { id: done.id }, data: { status: "COMPLETED" } });
    let blocked = false;
    try { await openCycleInPeriod(done.id, "QUARTERLY" as any, "Nope", hr); } catch (e) { if (e instanceof WorkflowError) blocked = true; }
    record({ name: "4. Cannot open a cycle in a completed period", expected: "blocked", actual: blocked ? "blocked" : "NOT blocked", pass: blocked });
  } catch (e: any) { record({ name: "4. Completed-period guard", expected: "-", actual: "threw: " + e.message, pass: false }); }

  try {
    const res = await completeReviewPeriod(seededCurrent.id, hr);
    const blocked = res.ok === false && Array.isArray((res as any).outstanding) && (res as any).outstanding.length > 0;
    const stillActive = (await prisma.reviewPeriod.findUniqueOrThrow({ where: { id: seededCurrent.id } })).status === "ACTIVE";
    record({ name: "5. completeReviewPeriod blocked while reviews non-terminal; lists outstanding; no state change", expected: "ok=false, outstanding>0, period still ACTIVE", actual: `ok=${(res as any).ok}, outstanding=${(res as any).outstanding?.length}, stillActive=${stillActive}`, pass: blocked && stillActive });
  } catch (e: any) { record({ name: "5. completeReviewPeriod block", expected: "-", actual: "threw: " + e.message, pass: false }); }

  try {
    const clean = await createReviewPeriod("CLEAN-2028", hr);
    const cyc = await openCycleInPeriod(clean.id, "QUARTERLY" as any, "Q1 2028", hr);
    await createQuarterlyReviewsForCycle(cyc.id, hr);
    const blockedRes = await completeReviewPeriod(clean.id, hr);
    const remaining = await prisma.review.findMany({ where: { cycleId: cyc.id, status: { notIn: ["COMPLETE", "ARCHIVED"] } } });
    for (const r of remaining) {
      const emp = await prisma.employee.findUniqueOrThrow({ where: { id: r.employeeId } });
      const mgr = await prisma.employee.findUniqueOrThrow({ where: { id: r.managerId } });
      const empU = await asUser(emp.workEmail);
      const mgrU = await asUser(mgr.workEmail);
      await saveEmployeeDraft(r.id, empU, { ratings: qRatings(0) });
      await submitReview(r.id, empU);
      await managerOpen(r.id, mgrU);
      await saveManagerDraft(r.id, mgrU, { ratings: qRatings(2) });
      await managerComplete(r.id, mgrU);
    }
    const okRes = await completeReviewPeriod(clean.id, hr);
    const reloaded = await prisma.reviewPeriod.findUniqueOrThrow({ where: { id: clean.id }, include: { cycles: true } });
    const cyclesClosed = reloaded.cycles.every((c) => !c.isOpen);
    const pass = (blockedRes as any).ok === false && (okRes as any).ok === true && reloaded.status === "COMPLETED" && reloaded.closedAt !== null && cyclesClosed;
    record({ name: "6. completeReviewPeriod succeeds when all terminal: COMPLETED + closedAt + cycles closed", expected: "blocked first, then ok; COMPLETED, closedAt set, cycles closed", actual: `firstOk=${(blockedRes as any).ok}, thenOk=${(okRes as any).ok}, status=${reloaded.status}, closedAt=${reloaded.closedAt ? "set" : "null"}, cyclesClosed=${cyclesClosed}`, pass });
  } catch (e: any) { record({ name: "6. completeReviewPeriod success", expected: "-", actual: "threw: " + e.message, pass: false }); }

  try {
    let refused = false;
    try { await createReviewPeriod("SNEAKY", petra); } catch (e) { if (e instanceof WorkflowError) refused = true; }
    record({ name: "7. Period management is HR-only (non-HR create refused)", expected: "refused", actual: refused ? "refused" : "NOT refused", pass: refused });
  } catch (e: any) { record({ name: "7. HR-only guard", expected: "-", actual: "threw: " + e.message, pass: false }); }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== SUMMARY: ${passed}/${results.length} passed ===`);
  for (const r of results) console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}
main().catch(async (e) => { console.error("Harness crashed:", e); await prisma.$disconnect(); process.exit(1); });