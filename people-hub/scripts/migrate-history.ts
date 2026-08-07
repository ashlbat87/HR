// v0.9 historical migration importer. Reads a folder of filled review workbooks and writes
// COMPLETE historic reviews to the Hub (Option B: direct-to-final-state, honest "IMPORTED"
// audit — no impersonation). Idempotent. Find-or-creates the named historic period + cycles
// (period is NOT set current). Manager taken from the Hub employee record (workbook manager
// name is noted in audit only). Uses the app's calculateQuarterlyScore and rating shape so
// migrated data is identical to native data. SYNTHETIC DATA ONLY until the v0.10 gate.
//
// CLI:  npx tsx scripts/migrate-history.ts <folder> <year>
// Test: imported by scripts/stage8-migration-acceptance.ts (calls importWorkbooks directly).

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/shared/lib/prisma";
import { extractWorkbook, quarterlyOfficial, type ExtractOk } from "./lib/extract-workbook";
import { normaliseName, QUARTER_SHEETS, VALUES, type QuarterSheet, type Crit } from "./lib/review-template-anchors";
import { calculateQuarterlyScore, QUARTERLY_ITEMS } from "@/modules/performance/review-workflow";
import { recordAudit } from "@/core/audit";

const CRIT_TO_ITEM: Record<Crit, string> = { impact: "IMPACT", quality: "QUALITY", delivery: "DELIVERY" };
const QUARTER_TO_LABEL: Record<QuarterSheet, string> = {
  "Q1 Review": "Q1", "Q2 Review": "Q2", "Q3 Review": "Q3", "Q4 Review": "Q4",
};

export interface FileOutcome {
  file: string;
  status: "imported" | "quarantined";
  employeeName: string | null;
  quartersImported: string[];
  valuesImported: boolean;
  reasons: string[];
}
export interface ImportReport {
  periodLabel: string;
  files: FileOutcome[];
  totals: { imported: number; quarantined: number };
}

// --- Employee matching: normalised displayName -> exactly one Hub employee with a manager. ---
type MatchOk = { ok: true; employeeId: string; managerId: string };
type MatchFail = { ok: false; reason: string };

async function matchEmployee(name: string): Promise<MatchOk | MatchFail> {
  const target = normaliseName(name);
  const all = await prisma.employee.findMany({ select: { id: true, displayName: true, managerId: true } });
  const hits = all.filter((e) => normaliseName(e.displayName) === target);
  if (hits.length === 0) return { ok: false, reason: `employee not found in Hub: "${name}"` };
  if (hits.length > 1) return { ok: false, reason: `ambiguous name match (${hits.length}) for "${name}"` };
  const e = hits[0];
  if (!e.managerId) return { ok: false, reason: `employee has no manager in Hub: "${name}"` };
  return { ok: true, employeeId: e.id, managerId: e.managerId };
}

// --- Find-or-create the historic period + its cycles. Period is NOT set current. ---
interface PeriodCycles {
  periodId: string;
  quarterCycleId: Record<QuarterSheet, string>;
  valuesCycleId: string;
}

async function ensurePeriodAndCycles(year: string): Promise<PeriodCycles> {
  // Period: find by label, or create with isCurrent:false (never hijack the current period).
  let period = await prisma.reviewPeriod.findFirst({ where: { label: year } });
  if (!period) period = await prisma.reviewPeriod.create({ data: { label: year, isCurrent: false } });

  // Quarterly cycles: one per quarter, labelled "Q1 <year>" etc, isOpen:false (historic).
  const quarterCycleId = {} as Record<QuarterSheet, string>;
  for (const sheet of QUARTER_SHEETS) {
    const label = `${QUARTER_TO_LABEL[sheet]} ${year}`;
    let cycle = await prisma.reviewCycle.findFirst({ where: { periodId: period.id, type: "QUARTERLY", label } });
    if (!cycle) cycle = await prisma.reviewCycle.create({ data: { type: "QUARTERLY", label, isOpen: false, periodId: period.id } });
    quarterCycleId[sheet] = cycle.id;
  }

  // Values cycle.
  const vLabel = `Values ${year}`;
  let vCycle = await prisma.reviewCycle.findFirst({ where: { periodId: period.id, type: "ANNUAL_VALUES", label: vLabel } });
  if (!vCycle) vCycle = await prisma.reviewCycle.create({ data: { type: "ANNUAL_VALUES", label: vLabel, isOpen: false, periodId: period.id } });

  return { periodId: period.id, quarterCycleId, valuesCycleId: vCycle.id };
}

// --- Idempotent upsert of one COMPLETE quarterly review + its ratings. Returns true if the
//     quarter had manager ratings and was written; false if nothing to import. ---
async function importQuarter(employeeId: string, managerId: string, cycleId: string, q: ExtractOk["quarters"][number], actorEmail: string, sourceFile: string, workbookManager: string | null): Promise<boolean> {
  const mgrScores = (["impact", "quality", "delivery"] as Crit[]).map((c) => q.crits[c].mgr).filter((v): v is number => v != null);
  if (mgrScores.length === 0) return false; // nothing to import for this quarter
  const quarterlyScore = calculateQuarterlyScore(mgrScores);

  // Idempotent: find existing review for this employee+cycle+type, else create.
  let review = await prisma.review.findFirst({ where: { employeeId, cycleId, type: "QUARTERLY" } });
  if (!review) {
    review = await prisma.review.create({
      data: { cycleId, type: "QUARTERLY", employeeId, managerId, status: "COMPLETE", quarterlyScore },
    });
  } else {
    await prisma.review.update({ where: { id: review.id }, data: { status: "COMPLETE", quarterlyScore, managerId } });
  }

  // Ratings, both sides, per criterion (upsert on the unique [reviewId, side, item]).
  for (const c of ["impact", "quality", "delivery"] as Crit[]) {
    const item = CRIT_TO_ITEM[c];
    const mgr = q.crits[c].mgr;
    const self = q.crits[c].self;
    if (mgr != null) {
      await prisma.reviewRating.upsert({
        where: { reviewId_side_item: { reviewId: review.id, side: "MANAGER", item } },
        create: { reviewId: review.id, side: "MANAGER", item, score: mgr, comment: null },
        update: { score: mgr },
      });
    }
    if (self != null) {
      await prisma.reviewRating.upsert({
        where: { reviewId_side_item: { reviewId: review.id, side: "EMPLOYEE", item } },
        create: { reviewId: review.id, side: "EMPLOYEE", item, score: self, comment: null },
        update: { score: self },
      });
    }
  }

  await recordAudit({
    actorEmail,
    action: "review.import_historic",
    entityType: "Review",
    entityId: review.id,
    detail: `IMPORTED from ${sourceFile}; quarter ${q.sheet}; workbook manager="${workbookManager ?? ""}" (managerId taken from Hub)`,
  });
  return true;
}

// --- Idempotent upsert of one COMPLETE values review + its four value ratings. ---
async function importValues(employeeId: string, managerId: string, cycleId: string, values: ExtractOk["values"], actorEmail: string, sourceFile: string): Promise<boolean> {
  if (values.length === 0) return false;
  const mgrScores = values.map((v) => v.mgr);
  const valuesScore = calculateQuarterlyScore(mgrScores);

  let review = await prisma.review.findFirst({ where: { employeeId, cycleId, type: "ANNUAL_VALUES" } });
  if (!review) {
    review = await prisma.review.create({
      data: { cycleId, type: "ANNUAL_VALUES", employeeId, managerId, status: "COMPLETE", valuesScore },
    });
  } else {
    await prisma.review.update({ where: { id: review.id }, data: { status: "COMPLETE", valuesScore, managerId } });
  }

  for (const v of values) {
    await prisma.reviewRating.upsert({
      where: { reviewId_side_item: { reviewId: review.id, side: "MANAGER", item: v.key } },
      create: { reviewId: review.id, side: "MANAGER", item: v.key, score: v.mgr, comment: null },
      update: { score: v.mgr },
    });
    if (v.self != null) {
      await prisma.reviewRating.upsert({
        where: { reviewId_side_item: { reviewId: review.id, side: "EMPLOYEE", item: v.key } },
        create: { reviewId: review.id, side: "EMPLOYEE", item: v.key, score: v.self, comment: null },
        update: { score: v.self },
      });
    }
  }

  await recordAudit({
    actorEmail,
    action: "review.import_historic",
    entityType: "Review",
    entityId: review.id,
    detail: `IMPORTED from ${sourceFile}; ANNUAL_VALUES`,
  });
  return true;
}

// --- Orchestration: process one folder of workbooks for a given historic year. ---
export async function importWorkbooks(dir: string, opts: { periodLabel: string; actorEmail: string }): Promise<ImportReport> {
  const report: ImportReport = { periodLabel: opts.periodLabel, files: [], totals: { imported: 0, quarantined: 0 } };
  const pc = await ensurePeriodAndCycles(opts.periodLabel);

  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".xlsx")).sort();
  for (const file of files) {
    const outcome: FileOutcome = { file, status: "quarantined", employeeName: null, quartersImported: [], valuesImported: false, reasons: [] };
    try {
      const wb = XLSX.readFile(path.join(dir, file));
      const ex = extractWorkbook(wb);
      outcome.employeeName = ex.employeeName;
      if (!ex.ok) {
        outcome.reasons = ex.reasons;
        report.files.push(outcome); report.totals.quarantined++; continue;
      }
      const match = await matchEmployee(ex.employeeName);
      if (!match.ok) {
        outcome.reasons = [match.reason];
        report.files.push(outcome); report.totals.quarantined++; continue;
      }
      for (const q of ex.quarters) {
        const wrote = await importQuarter(match.employeeId, match.managerId, pc.quarterCycleId[q.sheet], q, opts.actorEmail, file, ex.managerName);
        if (wrote) outcome.quartersImported.push(QUARTER_TO_LABEL[q.sheet]);
      }
      outcome.valuesImported = await importValues(match.employeeId, match.managerId, pc.valuesCycleId, ex.values, opts.actorEmail, file);
      outcome.status = "imported";
      report.files.push(outcome); report.totals.imported++;
    } catch (err) {
      outcome.reasons = [`error: ${err instanceof Error ? err.message : String(err)}`];
      report.files.push(outcome); report.totals.quarantined++;
    }
  }
  return report;
}

async function main() {
  const [dir, year] = process.argv.slice(2);
  if (!dir || !year) {
    console.error("Usage: npx tsx scripts/migrate-history.ts <folder> <year>");
    process.exit(1);
  }
  const report = await importWorkbooks(dir, { periodLabel: year, actorEmail: "migration@system" });
  console.log(`\n=== Historical migration — period ${report.periodLabel} ===`);
  for (const f of report.files) {
    if (f.status === "imported") {
      console.log(`  OK         ${f.file} — ${f.employeeName} — quarters [${f.quartersImported.join(", ")}]${f.valuesImported ? " + values" : ""}`);
    } else {
      console.log(`  QUARANTINE ${f.file} — ${f.employeeName ?? "?"} — ${f.reasons.join("; ")}`);
    }
  }
  console.log(`\nTotals: ${report.totals.imported} imported, ${report.totals.quarantined} quarantined.`);
  await prisma.$disconnect();
}

if (process.argv[1] && process.argv[1].endsWith("migrate-history.ts")) {
  main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
}
