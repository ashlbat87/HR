// Stage 7d acceptance — verifies getManagerParticipation against a controlled fixture.
// Isolated (own period, tagged), torn down (PD-017). Hand-computed expectations.

import { prisma } from "../src/shared/lib/prisma";
import { getManagerParticipation } from "../src/modules/performance/reporting-queries";

type R = { name: string; expected: string; actual: string; pass: boolean };
const results: R[] = [];
function check(name: string, expected: unknown, actual: unknown) {
  const e = JSON.stringify(expected), a = JSON.stringify(actual);
  results.push({ name, expected: e, actual: a, pass: e === a });
}
function approx(name: string, expected: number | null, actual: number | null, tol = 0.01) {
  const pass = (expected == null && actual == null) || (expected != null && actual != null && Math.abs(expected - actual) < tol);
  results.push({ name, expected: String(expected), actual: String(actual), pass });
}

const TAG = "STAGE7D-FIXTURE";
async function makeEmp(name: string) {
  return prisma.employee.create({ data: { workEmail: `${name}.${Math.random().toString(36).slice(2,8)}@${TAG}.test`, displayName: name, role: TAG } });
}
async function makeReview(cycleId: string, empId: string, mgrId: string, opts: { submittedDaysAgo?: number; completedDaysAgo?: number }) {
  const r = await prisma.review.create({ data: { cycleId, type: "QUARTERLY", employeeId: empId, managerId: mgrId, status: "COMPLETE" } });
  const now = Date.now();
  if (opts.submittedDaysAgo != null) await prisma.reviewEvent.create({ data: { reviewId: r.id, type: "SUBMITTED", at: new Date(now - opts.submittedDaysAgo*86400000), actorId: empId, actorName: "e" } });
  if (opts.completedDaysAgo != null) await prisma.reviewEvent.create({ data: { reviewId: r.id, type: "MANAGER_COMPLETED", at: new Date(now - opts.completedDaysAgo*86400000), actorId: mgrId, actorName: "m" } });
  return r;
}

async function main() {
  const period = await prisma.reviewPeriod.create({ data: { label: TAG, isCurrent: false } });
  const cycle = await prisma.reviewCycle.create({ data: { periodId: period.id, type: "QUARTERLY", label: TAG+"-Q", isOpen: true } });

  const mgrA = await makeEmp("Mgr A");
  const a1 = await makeEmp("A emp1"); await makeReview(cycle.id, a1.id, mgrA.id, { submittedDaysAgo: 12, completedDaysAgo: 10 });
  const a2 = await makeEmp("A emp2"); await makeReview(cycle.id, a2.id, mgrA.id, { submittedDaysAgo: 8, completedDaysAgo: 4 });
  const a3 = await makeEmp("A emp3"); await makeReview(cycle.id, a3.id, mgrA.id, { completedDaysAgo: 5 });
  const a4 = await makeEmp("A emp4"); await makeReview(cycle.id, a4.id, mgrA.id, { submittedDaysAgo: 3 });

  const mgrB = await makeEmp("Mgr B");
  const b1 = await makeEmp("B emp1"); await makeReview(cycle.id, b1.id, mgrB.id, { submittedDaysAgo: 5 });
  const b2 = await makeEmp("B emp2"); await makeReview(cycle.id, b2.id, mgrB.id, {});

  const scope = { periodId: period.id };
  const part = await getManagerParticipation(scope);
  const A = part.find((m) => m.managerId === mgrA.id)!;
  const B = part.find((m) => m.managerId === mgrB.id)!;

  check("A assigned = 4", 4, A.assigned);
  check("A completed = 3", 3, A.completed);
  approx("A completion% = 75", 75, A.completionPct);
  approx("A median days = 3", 3, A.medianDays);
  check("B assigned = 2", 2, B.assigned);
  check("B completed = 0", 0, B.completed);
  approx("B completion% = 0", 0, B.completionPct);
  check("B median = null", null, B.medianDays);

  await prisma.reviewEvent.deleteMany({ where: { review: { cycle: { periodId: period.id } } } });
  await prisma.review.deleteMany({ where: { cycle: { periodId: period.id } } });
  await prisma.reviewCycle.deleteMany({ where: { periodId: period.id } });
  await prisma.reviewPeriod.delete({ where: { id: period.id } });
  await prisma.employee.deleteMany({ where: { role: TAG } });

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== STAGE 7d ACCOUNTABILITY: ${passed}/${results.length} passed ===`);
  for (const r of results) console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  (expected ${r.expected}, got ${r.actual})`}`);
  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}
main().catch(async (e) => { console.error("crashed:", e); await prisma.$disconnect(); process.exit(1); });
