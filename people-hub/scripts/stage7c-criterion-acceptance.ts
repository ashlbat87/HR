// Stage 7c criterion acceptance — verifies getCriterionBreakdown against a controlled,
// hand-computed fixture. Isolated (own period, tagged employees), torn down after (PD-017).

import { prisma } from "../src/shared/lib/prisma";
import { getCriterionBreakdown, reviewsInCriterionBucket } from "../src/modules/performance/reporting-queries";

type R = { name: string; expected: string; actual: string; pass: boolean };
const results: R[] = [];
function check(name: string, expected: unknown, actual: unknown) {
  const e = JSON.stringify(expected), a = JSON.stringify(actual);
  results.push({ name, expected: e, actual: a, pass: e === a });
}
function approx(name: string, expected: number | null, actual: number | null, tol = 0.001) {
  const pass = (expected == null && actual == null) || (expected != null && actual != null && Math.abs(expected - actual) < tol);
  results.push({ name, expected: String(expected), actual: String(actual), pass });
}

const TAG = "STAGE7C-CRIT-FIXTURE";

async function makeEmp(name: string) {
  return prisma.employee.create({ data: { workEmail: `${name}.${Math.random().toString(36).slice(2,8)}@${TAG}.test`, displayName: name, role: TAG } });
}

async function main() {
  const period = await prisma.reviewPeriod.create({ data: { label: TAG, isCurrent: false } });
  const cycle = await prisma.reviewCycle.create({ data: { periodId: period.id, type: "QUARTERLY", label: TAG + "-Q", isOpen: true } });
  const mgr = await makeEmp("Crit Mgr");

  // Fixture: 4 reviews with known MANAGER item scores (Impact, Quality, Delivery).
  //  R1: I5 Q3 D4
  //  R2: I4 Q3 D2
  //  R3: I4 Q2 D5
  //  R4: I3 Q2 D1
  const rows = [
    { I: 5, Q: 3, D: 4 },
    { I: 4, Q: 3, D: 2 },
    { I: 4, Q: 2, D: 5 },
    { I: 3, Q: 2, D: 1 },
  ];
  for (const r of rows) {
    const emp = await makeEmp("Crit Emp");
    const review = await prisma.review.create({ data: { cycleId: cycle.id, type: "QUARTERLY", employeeId: emp.id, managerId: mgr.id, status: "COMPLETE" } });
    await prisma.reviewRating.create({ data: { reviewId: review.id, side: "MANAGER", item: "IMPACT", score: r.I } });
    await prisma.reviewRating.create({ data: { reviewId: review.id, side: "MANAGER", item: "QUALITY", score: r.Q } });
    await prisma.reviewRating.create({ data: { reviewId: review.id, side: "MANAGER", item: "DELIVERY", score: r.D } });
  }

  const scope = { periodId: period.id };
  const breakdown = await getCriterionBreakdown(scope);
  const impact = breakdown.find((c) => c.item === "IMPACT")!;
  const quality = breakdown.find((c) => c.item === "QUALITY")!;
  const delivery = breakdown.find((c) => c.item === "DELIVERY")!;

  // Hand-computed:
  // IMPACT scores [5,4,4,3] -> avg 4.0; counts {3:1,4:2,5:1}; %at4-5 = 3/4 = 75
  approx("Impact avg 4.0", 4.0, impact.average);
  check("Impact counts", { "1": 0, "2": 0, "3": 1, "4": 2, "5": 1 }, impact.counts);
  approx("Impact %at4-5 = 75", 75, impact.pctAt4or5);
  check("Impact n=4", 4, impact.n);
  // QUALITY scores [3,3,2,2] -> avg 2.5; counts {2:2,3:2}; %at4-5 = 0
  approx("Quality avg 2.5", 2.5, quality.average);
  check("Quality counts", { "1": 0, "2": 2, "3": 2, "4": 0, "5": 0 }, quality.counts);
  approx("Quality %at4-5 = 0", 0, quality.pctAt4or5);
  // DELIVERY scores [4,2,5,1] -> avg 3.0; counts {1:1,2:1,4:1,5:1}; %at4-5 = 2/4 = 50
  approx("Delivery avg 3.0", 3.0, delivery.average);
  check("Delivery counts", { "1": 1, "2": 1, "3": 0, "4": 1, "5": 1 }, delivery.counts);
  approx("Delivery %at4-5 = 50", 50, delivery.pctAt4or5);

  // Drill-down: Impact level 4 -> reviews with Impact rounding to 4 = R2,R3 (both 4) = 2.
  const impact4 = await reviewsInCriterionBucket(scope, "IMPACT", 4);
  check("Impact level-4 drilldown = 2", 2, impact4.length);
  // Delivery level 1 -> only R4 (D1) = 1.
  const delivery1 = await reviewsInCriterionBucket(scope, "DELIVERY", 1);
  check("Delivery level-1 drilldown = 1", 1, delivery1.length);

  // Teardown.
  await prisma.reviewRating.deleteMany({ where: { review: { cycle: { periodId: period.id } } } });
  await prisma.review.deleteMany({ where: { cycle: { periodId: period.id } } });
  await prisma.reviewCycle.deleteMany({ where: { periodId: period.id } });
  await prisma.reviewPeriod.delete({ where: { id: period.id } });
  await prisma.employee.deleteMany({ where: { role: TAG } });

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== STAGE 7c CRITERION: ${passed}/${results.length} passed ===`);
  for (const r of results) console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  (expected ${r.expected}, got ${r.actual})`}`);
  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}
main().catch(async (e) => { console.error("Harness crashed:", e); await prisma.$disconnect(); process.exit(1); });
