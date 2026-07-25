// Stage 7a acceptance — reporting query layer. Builds its own controlled fixture with
// hand-computed expected values, asserts exactly, then tears the fixture down. Isolated
// from the app seed (PD-014; per Ash's Stage 7a direction).

import { prisma } from "../src/shared/lib/prisma";
import {
  getReviewData, computeDistribution, computeGap, computeGroupComparison,
  getManagerMedianCompletionTimes, buildExecutiveSummary, getReviewIdsForScope,
} from "../src/modules/performance/reporting-queries";

type Result = { name: string; expected: string; actual: string; pass: boolean };
const results: Result[] = [];
function check(name: string, expected: unknown, actual: unknown) {
  const e = JSON.stringify(expected), a = JSON.stringify(actual);
  results.push({ name, expected: e, actual: a, pass: e === a });
}
function approx(name: string, expected: number | null, actual: number | null, tol = 0.001) {
  const pass = (expected == null && actual == null) || (expected != null && actual != null && Math.abs(expected - actual) < tol);
  results.push({ name, expected: String(expected), actual: String(actual), pass });
}

const TAG = "STAGE7A-FIXTURE";

async function makeEmployee(name: string, dept: string, func: any, managerId: string | null) {
  return prisma.employee.create({
    data: {
      workEmail: `${name.replace(/\s/g, ".").toLowerCase()}.${Date.now()}.${Math.random().toString(36).slice(2,7)}@${TAG}.test`,
      displayName: name, department: dept, ratingGuideCategory: func, managerId: managerId ?? undefined,
      role: TAG,
    },
  });
}

async function makeReview(opts: {
  cycleId: string; type: any; employeeId: string; managerId: string;
  mgr: number; self: number | null; items: string[];
  submittedDaysAgo?: number; completedDaysAgo?: number;
}) {
  const r = await prisma.review.create({
    data: { cycleId: opts.cycleId, type: opts.type, employeeId: opts.employeeId, managerId: opts.managerId, status: "COMPLETE" },
  });
  for (const item of opts.items) {
    await prisma.reviewRating.create({ data: { reviewId: r.id, side: "MANAGER", item, score: opts.mgr } });
    if (opts.self != null) await prisma.reviewRating.create({ data: { reviewId: r.id, side: "EMPLOYEE", item, score: opts.self } });
  }
  const now = Date.now();
  if (opts.submittedDaysAgo != null)
    await prisma.reviewEvent.create({ data: { reviewId: r.id, type: "SUBMITTED", at: new Date(now - opts.submittedDaysAgo * 86400000), actorId: opts.employeeId, actorName: "emp" } });
  if (opts.completedDaysAgo != null)
    await prisma.reviewEvent.create({ data: { reviewId: r.id, type: "MANAGER_COMPLETED", at: new Date(now - opts.completedDaysAgo * 86400000), actorId: opts.managerId, actorName: "mgr" } });
  return r;
}

async function main() {
  // ---- Build fixture ----
  const period = await prisma.reviewPeriod.create({ data: { label: TAG, isCurrent: false } });
  const qCycle = await prisma.reviewCycle.create({ data: { periodId: period.id, type: "QUARTERLY", label: TAG + "-Q", isOpen: true } });
  const vCycle = await prisma.reviewCycle.create({ data: { periodId: period.id, type: "ANNUAL_VALUES", label: TAG + "-V", isOpen: true } });

  const m1 = await makeEmployee("Alpha Mgr", "Engineering", "ENGINEERING", null);
  const m2 = await makeEmployee("Beta Mgr", "Sales", "SALES_COMMERCIAL", null);
  const PI = ["IMPACT", "QUALITY", "DELIVERY"];

  // Performance reviews R1..R8 (mgr, self) with dept/func/manager per design.
  const specs = [
    { mgr: 5, self: 4, m: m1, dept: "Engineering", func: "ENGINEERING", sub: 12, comp: 10 }, // 2d
    { mgr: 5, self: 5, m: m1, dept: "Engineering", func: "ENGINEERING", sub: 8, comp: 4 },   // 4d
    { mgr: 4, self: 3, m: m1, dept: "Engineering", func: "ENGINEERING" },
    { mgr: 4, self: 4, m: m1, dept: "Engineering", func: "ENGINEERING" },
    { mgr: 4, self: 2, m: m2, dept: "Sales", func: "SALES_COMMERCIAL", sub: 30, comp: 20 }, // 10d
    { mgr: 3, self: 3, m: m2, dept: "Sales", func: "SALES_COMMERCIAL", sub: 40, comp: 20 }, // 20d
    { mgr: 3, self: 4, m: m2, dept: "Sales", func: "SALES_COMMERCIAL" },
    { mgr: 2, self: 2, m: m2, dept: "Sales", func: "SALES_COMMERCIAL" },
  ];
  for (const s of specs) {
    const emp = await makeEmployee("Emp", s.dept, s.func, s.m.id);
    await makeReview({ cycleId: qCycle.id, type: "QUARTERLY", employeeId: emp.id, managerId: s.m.id, mgr: s.mgr, self: s.self, items: PI, submittedDaysAgo: s.sub, completedDaysAgo: s.comp });
  }
  // Values reviews (separate): two, scores 5 and 1, to prove separation.
  for (const vs of [5, 1]) {
    const emp = await makeEmployee("VEmp", "Engineering", "ENGINEERING", m1.id);
    await makeReview({ cycleId: vCycle.id, type: "ANNUAL_VALUES", employeeId: emp.id, managerId: m1.id, mgr: vs, self: vs, items: ["Ownership", "Craft"] });
  }

  const scope = { periodId: period.id };

  // ---- Assertions ----
  const perf = await getReviewData("PERFORMANCE", scope);
  check("perf population n=8", 8, perf.length);

  const dist = computeDistribution("PERFORMANCE", perf);
  check("perf distribution counts", { "1": 0, "2": 1, "3": 2, "4": 3, "5": 2 }, dist.counts);
  approx("perf average 3.75", 3.75, dist.average);
  approx("perf %at4-5 = 62.5", 62.5, dist.pctAt4or5);
  approx("perf %at1-2 = 12.5", 12.5, dist.pctAt1or2);

  const gap = computeGap("PERFORMANCE", perf);
  approx("perf avg gap 0.375", 0.375, gap.averageGap);
  check("perf gap sizes", { zero: 4, one: 3, twoPlus: 1 }, gap.sizeDistribution);

  const byDept = computeGroupComparison("PERFORMANCE", perf, "department");
  const eng = byDept.find((g) => g.key === "Engineering")!;
  const sales = byDept.find((g) => g.key === "Sales")!;
  check("eng n=4", 4, eng.n); approx("eng avg 4.5", 4.5, eng.average); approx("eng diff +0.75", 0.75, eng.diffFromOrg);
  check("sales n=4", 4, sales.n); approx("sales avg 3.0", 3.0, sales.average); approx("sales diff -0.75", -0.75, sales.diffFromOrg);

  const byFunc = computeGroupComparison("PERFORMANCE", perf, "func");
  check("func groups = 2", 2, byFunc.length);
  const engF = byFunc.find((g) => g.key === "ENGINEERING")!;
  approx("func ENGINEERING avg 4.5", 4.5, engF.average);

  const byMgr = computeGroupComparison("PERFORMANCE", perf, "manager");
  const mgr1 = byMgr.find((g) => g.key === m1.id)!;
  approx("m1 avg 4.5", 4.5, mgr1.average); check("m1 n=4", 4, mgr1.n);

  const medians = await getManagerMedianCompletionTimes(scope);
  const med1 = medians.find((m) => m.managerId === m1.id)!;
  const med2 = medians.find((m) => m.managerId === m2.id)!;
  approx("m1 median days = 3", 3, med1.medianDays);
  approx("m2 median days = 15", 15, med2.medianDays);

  // Separation: values population is 2, and its scores never affect performance.
  const vals = await getReviewData("VALUES", scope);
  check("values population n=2", 2, vals.length);
  const vdist = computeDistribution("VALUES", vals);
  check("values counts (1 and 5)", { "1": 1, "2": 0, "3": 0, "4": 0, "5": 1 }, vdist.counts);
  approx("values average 3.0", 3.0, vdist.average);
  check("perf distribution unaffected by values (still n=8)", 8, dist.total);

  // Drill-down: ids for Engineering department = 4 reviews.
  const engIds = await getReviewIdsForScope("PERFORMANCE", { periodId: period.id, department: "Engineering" });
  check("drill-down Engineering ids = 4", 4, engIds.length);

  // Executive Summary: department variance (0.75 > 0.5) fires; gap (0.375 < 0.75) does not.
  const summary = buildExecutiveSummary({ dimensionLabel: "Performance", distribution: dist, gap, groups: byDept, groupKind: "department" });
  check("summary: dept review phrase present", true, summary.whatToDo.includes("Department comparison may warrant further review."));
  check("summary: gap phrase absent", false, summary.whatToDo.includes("Self and manager ratings may warrant further review."));

  // Executive Summary boundary: with no groups/gap and a benign distribution, "no
  // immediate investigation".
  const benign = buildExecutiveSummary({ dimensionLabel: "Performance", distribution: dist, gap: null, groups: null, groupKind: null });
  check("summary benign: no-investigation phrase", true, benign.whatToDo.includes("No immediate investigation is recommended."));

  // ---- Teardown ----
  await prisma.reviewEvent.deleteMany({ where: { review: { cycle: { periodId: period.id } } } });
  await prisma.reviewRating.deleteMany({ where: { review: { cycle: { periodId: period.id } } } });
  await prisma.review.deleteMany({ where: { cycle: { periodId: period.id } } });
  await prisma.reviewCycle.deleteMany({ where: { periodId: period.id } });
  await prisma.reviewPeriod.delete({ where: { id: period.id } });
  await prisma.employee.deleteMany({ where: { role: TAG } });

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== STAGE 7a SUMMARY: ${passed}/${results.length} passed ===`);
  for (const r of results) console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  (expected ${r.expected}, got ${r.actual})`}`);
  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}
main().catch(async (e) => { console.error("Harness crashed:", e); await prisma.$disconnect(); process.exit(1); });
