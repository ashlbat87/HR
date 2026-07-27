// Reporting Demo Seed (v0.8) — OPTIONAL, deliberately run. Creates a clearly-labelled
// demo period with a realistic spread of completed performance + values reviews so the
// Reporting & Insights views can be seen and usability-tested with real shape. ISOLATED
// from the app seed and the test fixture (PD-017 spirit). Sets the demo period current so
// the reports (which scope to the current period) show it; restores the prior current
// period on --clear.
//   Run:    npx tsx scripts/seed-reporting-demo.ts
//   Clear:  npx tsx scripts/seed-reporting-demo.ts --clear

import { prisma } from "../src/shared/lib/prisma";

const TAG = "REPORTING-DEMO";
const PERIOD_LABEL = "2026 Reporting Demo";
const PI = ["IMPACT", "QUALITY", "DELIVERY"];
const VITEMS = ["Ownership", "Craft", "Team", "Customer"];

async function clear() {
  const period = await prisma.reviewPeriod.findFirst({ where: { label: PERIOD_LABEL } });
  if (period) {
    await prisma.reviewEvent.deleteMany({ where: { review: { cycle: { periodId: period.id } } } });
    await prisma.reviewRating.deleteMany({ where: { review: { cycle: { periodId: period.id } } } });
    await prisma.review.deleteMany({ where: { cycle: { periodId: period.id } } });
    await prisma.reviewCycle.deleteMany({ where: { periodId: period.id } });
    // Restore prior current period if we recorded one in the period's (reused) label marker.
    await prisma.reviewPeriod.delete({ where: { id: period.id } });
  }
  await prisma.employee.deleteMany({ where: { role: TAG } });
  // Restore a sensible current period: set the seed's "2026" current if nothing is.
  const anyCurrent = await prisma.reviewPeriod.findFirst({ where: { isCurrent: true } });
  if (!anyCurrent) {
    const twentySix = await prisma.reviewPeriod.findFirst({ where: { label: "2026" } });
    if (twentySix) await prisma.reviewPeriod.update({ where: { id: twentySix.id }, data: { isCurrent: true } });
  }
  console.log("Reporting demo cleared.");
}

async function makeEmp(name: string, dept: string, func: any, managerId: string | null) {
  return prisma.employee.create({
    data: {
      workEmail: `${name.replace(/\s/g, ".").toLowerCase()}.${Math.random().toString(36).slice(2, 8)}@${TAG}.test`,
      displayName: name, department: dept, ratingGuideCategory: func, managerId: managerId ?? undefined, role: TAG,
    },
  });
}

async function makeReview(cycleId: string, type: any, employeeId: string, managerId: string, items: string[], mgr: number, self: number, subDays: number, compDays: number) {
  const r = await prisma.review.create({ data: { cycleId, type, employeeId, managerId, status: "COMPLETE" } });
  for (const item of items) {
    await prisma.reviewRating.create({ data: { reviewId: r.id, side: "MANAGER", item, score: mgr } });
    await prisma.reviewRating.create({ data: { reviewId: r.id, side: "EMPLOYEE", item, score: self } });
  }
  const now = Date.now();
  await prisma.reviewEvent.create({ data: { reviewId: r.id, type: "SUBMITTED", at: new Date(now - subDays * 86400000), actorId: employeeId, actorName: "emp" } });
  await prisma.reviewEvent.create({ data: { reviewId: r.id, type: "MANAGER_COMPLETED", at: new Date(now - compDays * 86400000), actorId: managerId, actorName: "mgr" } });
}

async function seed() {
  // Move current flag to the demo period (reports scope to current).
  await prisma.reviewPeriod.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
  const period = await prisma.reviewPeriod.create({ data: { label: PERIOD_LABEL, isCurrent: true } });
  const q1Cycle = await prisma.reviewCycle.create({ data: { periodId: period.id, type: "QUARTERLY", label: "Q1 2026 (demo)", isOpen: false } });
  const qCycle = await prisma.reviewCycle.create({ data: { periodId: period.id, type: "QUARTERLY", label: "Q2 2026 (demo)", isOpen: true } });
  const vCycle = await prisma.reviewCycle.create({ data: { periodId: period.id, type: "ANNUAL_VALUES", label: "Values 2026 (demo)", isOpen: true } });

  // Four departments, each with a manager. Engineering deliberately rates higher (trips the
  // department variance threshold); Operations slightly lower; Sales/Product mid.
  const depts: { dept: string; func: any; mgrName: string; ratings: [number, number][] }[] = [
    // ratings: [managerScore, selfScore] per report
    { dept: "Engineering", func: "ENGINEERING", mgrName: "Sara Eng-Lead", ratings: [[5,4],[5,5],[4,4],[4,3],[5,4],[4,4]] },
    { dept: "Sales", func: "SALES_COMMERCIAL", mgrName: "Omar Sales-Lead", ratings: [[3,4],[4,5],[3,3],[2,4],[3,3],[4,4]] },
    { dept: "Product", func: "PRODUCT", mgrName: "Lena Prod-Lead", ratings: [[4,4],[3,3],[4,5],[3,2],[4,4]] },
    { dept: "Operations", func: "OPERATIONS", mgrName: "Yusuf Ops-Lead", ratings: [[2,3],[3,3],[2,2],[3,4],[2,2],[3,3]] },
  ];

  let subBase = 20, compBase = 16;
  for (const d of depts) {
    const mgr = await makeEmp(d.mgrName, d.dept, d.func, null);
    let i = 0;
    for (const [m, s] of d.ratings) {
      const emp = await makeEmp(`${d.dept} Person ${i + 1}`, d.dept, d.func, mgr.id);
      // Vary completion times per department so median differs (Ops slower).
      const slow = d.dept === "Operations" ? 25 : 6;
      await makeReview(qCycle.id, "QUARTERLY", emp.id, mgr.id, PI, m, s, subBase + slow, compBase);
      // Q1 (earlier cycle): a lower/different spread so switching cycles visibly changes the
      // chart and "Full year" visibly pools Q1+Q2. Shift manager & self down ~1, floored 1.
      const q1m = Math.max(1, m - 1);
      const q1s = Math.max(1, s - 1);
      const q1emp = await makeEmp(`${d.dept} Q1 Person ${i + 1}`, d.dept, d.func, mgr.id);
      await makeReview(q1Cycle.id, "QUARTERLY", q1emp.id, mgr.id, PI, q1m, q1s, subBase + slow + 90, compBase + 90);
      // A values review for some employees (separate dimension).
      if (i % 2 === 0) {
        const vm = Math.min(5, Math.max(1, m)); // values manager score close to perf but independent
        await makeReview(vCycle.id, "ANNUAL_VALUES", emp.id, mgr.id, VITEMS, vm, s, subBase, compBase);
      }
      i++;
    }
  }

  const perf = await prisma.review.count({ where: { type: "QUARTERLY", cycle: { periodId: period.id } } });
  const vals = await prisma.review.count({ where: { type: "ANNUAL_VALUES", cycle: { periodId: period.id } } });
  console.log(`Reporting demo seeded. Period "${PERIOD_LABEL}" is now current.`);
  console.log(`  Completed performance reviews: ${perf}`);
  console.log(`  Completed values reviews: ${vals}`);
  console.log(`  Clear with: npx tsx scripts/seed-reporting-demo.ts --clear`);
}

async function main() {
  if (process.argv.includes("--clear")) await clear();
  else await seed();
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
