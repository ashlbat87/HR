// 6a check — runs the dashboard queries against the seed and prints per-type stage
// counts, plus a couple of assertions. Run: npm run db:reset && npx tsx scripts/stage6a-check.ts
import { prisma } from "../src/shared/lib/prisma";
import { getPeriodStatusSummary, getFilteredReviews, getEmployeesMissingManager, getEmployeesMissingGuide } from "../src/modules/performance/dashboard-queries";

async function main() {
  console.log("=== 6a dashboard-queries check (against seed) ===\n");

  const period = await prisma.reviewPeriod.findFirstOrThrow({ where: { isCurrent: true } });
  console.log("Current period:", period.label, "\n");

  const summary = await getPeriodStatusSummary(period.id);
  if (summary.length === 0) {
    console.log("No reviews in the current period.");
  }
  for (const t of summary) {
    console.log(`${t.typeLabel}: ${t.completed}/${t.total} done (${t.completionPct}%)`);
    for (const s of t.stages) console.log(`    ${s.label}: ${s.count}`);
    console.log(`    outstanding: ${t.outstanding}`);
    console.log(`    ${t.bottleneck ?? "no outstanding reviews"}`);
    console.log("");
  }

  // Cross-check: for each type, the sum of its stage counts equals its total, and the
  // filtered-list length for each stage matches the summary's stage count.
  let ok = true;
  for (const t of summary) {
    const stageSum = t.stages.reduce((a, s) => a + s.count, 0);
    if (stageSum !== t.total) { ok = false; console.log(`[FAIL] ${t.typeLabel}: stage sum ${stageSum} != total ${t.total}`); }
    for (const s of t.stages) {
      const list = await getFilteredReviews({ periodId: period.id, type: t.type, stage: s.key });
      if (list.length !== s.count) { ok = false; console.log(`[FAIL] ${t.typeLabel}/${s.label}: list ${list.length} != count ${s.count}`); }
    }
  }
  console.log(ok ? "[PASS] stage sums and filtered-list counts are consistent." : "[FAIL] inconsistency found.");

  const noMgr = await getEmployeesMissingManager();
  const noGuide = await getEmployeesMissingGuide();
  console.log(`\nSetup issues: missing manager = ${noMgr.length}, missing rating guide = ${noGuide.length}`);
  if (noMgr.length) console.log("  no manager:", noMgr.map((e) => e.displayName).join(", "));
  if (noGuide.length) console.log("  no guide:", noGuide.map((e) => e.displayName).join(", "));

  await prisma.$disconnect();
  if (!ok) process.exit(1);
}
main().catch(async (e) => { console.error("Check crashed:", e); await prisma.$disconnect(); process.exit(1); });