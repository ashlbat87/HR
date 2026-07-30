// Reporting CSV export (v0.8, Stage 7e). One HR-guarded GET route handles every report type
// by re-running the matching query with the SAME scope the view used, then returns a
// self-describing CSV (PD-025). No new data — exports exactly what the report shows.
// Params: ?report=<type>&dimension=&cycle=&scope=&period=

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import {
  getReviewData, computeDistribution, computeGap, computeGroupComparison,
  getCriterionBreakdown, getManagerParticipation, getCompletionFunnel,
  type RatingDimension,
} from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery } from "@/modules/performance/reporting-scope";
import { buildCsv, csvFilename, type CsvMeta } from "@/modules/performance/csv-export";

const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isHR(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const report = sp.get("report") ?? "";
  const dimension = (sp.get("dimension") === "VALUES" ? "VALUES" : "PERFORMANCE") as RatingDimension;
  const dimLabel = dimension === "PERFORMANCE" ? "Performance" : "Values";

  const scope = await resolveScope(dimension, {
    cycle: sp.get("cycle") ?? undefined,
    scope: sp.get("scope") ?? undefined,
    period: sp.get("period") ?? undefined,
  });
  if (!scope) return NextResponse.json({ error: "no period" }, { status: 400 });
  const timeframe = scope.kind === "cycle" ? scope.cycleLabel : `Full year ${scope.periodLabel} (pooled)`;
  const q = scopeToQuery(scope);

  let title = "Report";
  let headers: string[] = [];
  let rows: (string | number | null)[][] = [];
  let population = 0;
  let dimForMeta: string | undefined = dimLabel;

  if (report === "distribution") {
    const data = await getReviewData(dimension, q);
    const dist = computeDistribution(dimension, data);
    title = `${dimLabel} distribution`;
    population = dist.total;
    headers = ["Rating", "Count"];
    rows = ([1, 2, 3, 4, 5] as const).map((l) => [LEVEL_LABEL[l], dist.counts[l]]);
    rows.push(["Average", dist.average != null ? dist.average.toFixed(2) : ""]);
    rows.push(["% at 4-5", `${Math.round(dist.pctAt4or5)}%`]);
  } else if (report === "gaps") {
    const data = await getReviewData(dimension, q);
    const gap = computeGap(dimension, data);
    title = "Self vs manager gaps";
    population = gap.total;
    headers = ["Gap size", "Reviews"];
    rows = [
      ["Agreed (same rating)", gap.sizeDistribution.zero],
      ["Differed by one level", gap.sizeDistribution.one],
      ["Differed by two or more", gap.sizeDistribution.twoPlus],
      ["Average gap (manager - self)", gap.averageGap != null ? gap.averageGap.toFixed(2) : ""],
    ];
  } else if (report === "department" || report === "manager") {
    const groupBy = report as "department" | "manager";
    const data = await getReviewData(dimension, q);
    const groups = computeGroupComparison(dimension, data, groupBy);
    title = `${groupBy === "department" ? "Department" : "Manager"} comparison`;
    population = data.length;
    headers = [groupBy === "department" ? "Department" : "Manager", "Reviews", "Average", "% at 4-5", "Diff vs org"];
    rows = groups.map((g) => [g.label, g.n, g.average != null ? g.average.toFixed(2) : "", `${Math.round(g.pctAt4or5)}%`, g.diffFromOrg != null ? g.diffFromOrg.toFixed(2) : ""]);
  } else if (report === "criterion") {
    const breakdown = await getCriterionBreakdown(q);
    title = "Performance criterion analysis";
    population = Math.max(0, ...breakdown.map((c) => c.n));
    headers = ["Criterion", "Reviews", "Average", "% at 4-5", "Poor", "Base", "Intermediate", "Advanced", "Rock Star"];
    rows = breakdown.map((c) => [c.label, c.n, c.average != null ? c.average.toFixed(2) : "", `${Math.round(c.pctAt4or5)}%`, c.counts[1], c.counts[2], c.counts[3], c.counts[4], c.counts[5]]);
  } else if (report === "accountability") {
    const part = await getManagerParticipation(q);
    title = "Manager accountability";
    population = part.reduce((a, m) => a + m.assigned, 0);
    dimForMeta = undefined; // spans all review types
    headers = ["Manager", "Assigned", "Completed", "Completion %", "Median days"];
    rows = part.map((m) => [m.managerName, m.assigned, m.completed, `${Math.round(m.completionPct)}%`, m.medianDays != null ? m.medianDays.toFixed(1) : ""]);
  } else if (report === "completion") {
    const { stages, total } = await getCompletionFunnel(q);
    title = "Completion funnel";
    population = total;
    dimForMeta = undefined; // all review types
    headers = ["Stage", "Reviews"];
    rows = stages.map((s) => [s.label, s.count]);
  } else {
    return NextResponse.json({ error: "unknown report" }, { status: 400 });
  }

  const meta: CsvMeta = { title, timeframe, dimension: dimForMeta, population };
  const csv = buildCsv(meta, headers, rows);
  const filename = csvFilename(title, timeframe);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
