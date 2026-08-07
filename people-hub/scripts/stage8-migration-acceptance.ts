// Stage 8 (v0.9) migration acceptance harness. Seeds a KNOWN Hub state (Alice/Bob/Carol under
// a manager; NOT Dave), runs importWorkbooks against the synthetic fixtures, and asserts both
// the returned report AND the actual DB records. Idempotency checked by a second run.
// Run after `npm run db:reset`. Standalone (mutates DB). SYNTHETIC DATA ONLY.

import { prisma } from "@/shared/lib/prisma";
import { importWorkbooks } from "./migrate-history";

type R = { name: string; pass: boolean; detail?: string };
const results: R[] = [];
function check(name: string, cond: boolean, detail?: string) { results.push({ name, pass: cond, detail: cond ? undefined : detail }); }

async function seedKnownState() {
  // Clean slate for the entities this harness touches.
  await prisma.reviewRating.deleteMany();
  await prisma.reviewEvent.deleteMany();
  await prisma.review.deleteMany();
  await prisma.reviewCycle.deleteMany();
  await prisma.reviewPeriod.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.employee.deleteMany();

  const mgr = await prisma.employee.create({ data: { workEmail: "manager.one@example.test", displayName: "Manager One" } });
  for (const name of ["Alice Tester", "Bob Sample", "Carol Messy"]) {
    const email = name.toLowerCase().replace(/\s+/g, ".") + "@example.test";
    await prisma.employee.create({ data: { workEmail: email, displayName: name, managerId: mgr.id, ratingGuideCategory: "ENGINEERING" } });
  }
  // Dave is deliberately NOT seeded.
}

async function main() {
  await seedKnownState();
  const DIR = "scripts/synthetic-workbooks";

  const report = await importWorkbooks(DIR, { periodLabel: "2025", actorEmail: "migration@system" });
  const byFile = Object.fromEntries(report.files.map((f) => [f.file, f]));

  check("totals: 2 imported", report.totals.imported === 2, `got ${report.totals.imported}`);
  check("totals: 3 quarantined", report.totals.quarantined === 3, `got ${report.totals.quarantined}`);
  check("alice imported", byFile["alice_tester.xlsx"]?.status === "imported");
  check("alice 4 quarters", byFile["alice_tester.xlsx"]?.quartersImported.length === 4, JSON.stringify(byFile["alice_tester.xlsx"]?.quartersImported));
  check("alice values imported", byFile["alice_tester.xlsx"]?.valuesImported === true);
  check("bob imported", byFile["bob_sample.xlsx"]?.status === "imported");
  check("bob 2 quarters", byFile["bob_sample.xlsx"]?.quartersImported.length === 2, JSON.stringify(byFile["bob_sample.xlsx"]?.quartersImported));
  check("bob no values", byFile["bob_sample.xlsx"]?.valuesImported === false);
  check("carol quarantined", byFile["carol_messy.xlsx"]?.status === "quarantined");
  check("carol reason mentions rating", (byFile["carol_messy.xlsx"]?.reasons.join(" ") ?? "").includes("rating"));
  check("no_name quarantined", byFile["no_name.xlsx"]?.status === "quarantined");
  check("dave quarantined", byFile["dave_unknown.xlsx"]?.status === "quarantined");
  check("dave reason = not found", (byFile["dave_unknown.xlsx"]?.reasons.join(" ") ?? "").includes("not found"));

  const alice = await prisma.employee.findFirst({ where: { displayName: "Alice Tester" } });
  const q1cycle = await prisma.reviewCycle.findFirst({ where: { label: "Q1 2025", type: "QUARTERLY" } });
  const aliceQ1 = alice && q1cycle ? await prisma.review.findFirst({ where: { employeeId: alice.id, cycleId: q1cycle.id, type: "QUARTERLY" } }) : null;
  check("alice Q1 review exists", !!aliceQ1);
  check("alice Q1 status COMPLETE", aliceQ1?.status === "COMPLETE", aliceQ1?.status);
  check("alice Q1 quarterlyScore 4.3", aliceQ1?.quarterlyScore === 4.3, String(aliceQ1?.quarterlyScore));
  const aliceQ1ratings = aliceQ1 ? await prisma.reviewRating.count({ where: { reviewId: aliceQ1.id } }) : 0;
  check("alice Q1 has 6 ratings (3 mgr + 3 self)", aliceQ1ratings === 6, `got ${aliceQ1ratings}`);

  const vcycle = await prisma.reviewCycle.findFirst({ where: { label: "Values 2025", type: "ANNUAL_VALUES" } });
  const aliceV = alice && vcycle ? await prisma.review.findFirst({ where: { employeeId: alice.id, cycleId: vcycle.id, type: "ANNUAL_VALUES" } }) : null;
  check("alice values review exists", !!aliceV);
  check("alice valuesScore 4.5", aliceV?.valuesScore === 4.5, String(aliceV?.valuesScore));
  check("alice values not in quarterlyScore", aliceV?.quarterlyScore == null);

  const period = await prisma.reviewPeriod.findFirst({ where: { label: "2025" } });
  check("2025 period not current", period?.isCurrent === false, String(period?.isCurrent));

  const reviewsBefore = await prisma.review.count();
  await importWorkbooks(DIR, { periodLabel: "2025", actorEmail: "migration@system" });
  const reviewsAfter = await prisma.review.count();
  check("idempotent: review count unchanged on re-run", reviewsBefore === reviewsAfter, `${reviewsBefore} -> ${reviewsAfter}`);

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== STAGE 8 MIGRATION ACCEPTANCE: ${passed}/${results.length} passed ===`);
  for (const r of results) console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  (${r.detail})`}`);
  await prisma.$disconnect();
  if (passed !== results.length) process.exit(1);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
