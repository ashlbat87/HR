// Shared distribution view (v0.8, Stage 7b, rev 4). Chart is the hero; concise Executive
// Summary; KPI strip (Average | Median | Most Common | % Rated 4-5 | Completed Reviews);
// clickable bars drill to the underlying reviews; quiet metadata. Built to the frozen
// design note rev 4 (PD-009). HR-guarded by the calling page.

import Link from "next/link";
import { prisma } from "@/shared/lib/prisma";
import {
  getReviewData, computeDistribution, computeGap, computeGroupComparison,
  buildExecutiveSummary, computeMedianOfficial, computeModeLevel, type RatingDimension,
} from "@/modules/performance/reporting-queries";

const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

function nowGST(): string {
  const d = new Date(Date.now() + 4 * 3600 * 1000);
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}, ${hh}:${mm} GST`;
}

export async function DistributionView({ dimension, title }: { dimension: RatingDimension; title: string }) {
  const dimLabel = dimension === "PERFORMANCE" ? "Performance" : "Values";
  const currentPeriod = await prisma.reviewPeriod.findFirst({ where: { isCurrent: true } });
  const scope = currentPeriod ? { periodId: currentPeriod.id } : {};

  const data = await getReviewData(dimension, scope);
  const dist = computeDistribution(dimension, data);
  const gap = dimension === "PERFORMANCE" ? computeGap(dimension, data) : null;
  const byDept = computeGroupComparison(dimension, data, "department");
  const summary = buildExecutiveSummary({ dimensionLabel: dimLabel, distribution: dist, gap, groups: byDept, groupKind: "department" });
  const median = computeMedianOfficial(data);
  const modeLevel = computeModeLevel(dist);

  const maxCount = Math.max(1, ...([1, 2, 3, 4, 5] as const).map((l) => dist.counts[l]));
  const refreshed = nowGST();
  const drillBase = `/reporting/drilldown?dimension=${dimension}${currentPeriod ? `&period=${currentPeriod.id}` : ""}`;

  return (
    <div>
      {/* Header — title with quiet metadata */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>{title}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginLeft: 13, marginBottom: 14 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          <Link href="/reporting">Reporting &amp; Insights</Link> › {dimLabel} distribution
        </span>
        <span className="muted" style={{ fontSize: 11, opacity: 0.7 }}>Last refreshed {refreshed}</span>
      </div>

      {dist.total === 0 ? (
        <>
          <div className="card" style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Filters applied</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="chip">Period: {currentPeriod ? currentPeriod.label : "none"}</span>
              <span className="chip">Type: {dimLabel}</span>
            </div>
          </div>
          <div className="empty">No completed {dimLabel.toLowerCase()} ratings match these filters yet.</div>
        </>
      ) : (
        <>
          {/* Concise executive summary */}
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 12, fontSize: 13, lineHeight: 1.55 }}>
            <SummaryLine label="What happened" lines={summary.whatHappened} />
            <SummaryLine label="What HR should know" lines={summary.whatToKnow} />
            <SummaryLine label="What HR should do" lines={summary.whatToDo} />
          </div>

          {/* KPI strip */}
          <div style={{ display: "flex", border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 14, background: "var(--surface)" }}>
            <Kpi label="Average" value={dist.average != null ? dist.average.toFixed(1) : "—"} />
            <Kpi label="Median" value={median != null ? median.toFixed(1) : "—"} />
            <Kpi label="Most common" value={modeLevel != null ? LEVEL_LABEL[modeLevel] : "—"} wide />
            <Kpi label="% Rated 4–5" value={`${Math.round(dist.pctAt4or5)}%`} />
            <Kpi label="Completed reviews" value={String(dist.total)} last />
          </div>

          {/* Filters applied (compact, below KPIs) */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", alignSelf: "center" }}>Filters</span>
            <span className="chip">Period: {currentPeriod ? currentPeriod.label : "none"}</span>
            <span className="chip">Type: {dimLabel}</span>
          </div>

          {/* Hero chart with clickable bars */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180 }}>
              {([1, 2, 3, 4, 5] as const).map((l) => {
                const c = dist.counts[l];
                const h = Math.round((c / maxCount) * 150);
                return (
                  <Link key={l} href={`${drillBase}&level=${l}`} title="Click to view underlying reviews"
                    style={{ flex: 1, textAlign: "center", textDecoration: "none", color: "inherit" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{c}</div>
                    <div className="bar-drill" style={{ background: l >= 4 ? "var(--purple)" : "var(--purple-subtle)", height: Math.max(3, h), borderRadius: 4, transition: "opacity 0.12s ease" }} />
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{LEVEL_LABEL[l]}</div>
                  </Link>
                );
              })}
            </div>
            <div className="muted" style={{ textAlign: "center", fontSize: 11, marginTop: 12 }}>Click any rating to view the underlying reviews.</div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryLine({ label, lines }: { label: string; lines: string[] }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div style={{ marginBottom: 3 }}>
      <span className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span> · {lines.join(" ")}</span>
    </div>
  );
}

function Kpi({ label, value, wide, last }: { label: string; value: string; wide?: boolean; last?: boolean }) {
  return (
    <div style={{ flex: wide ? 1.3 : 1, padding: "8px 12px", borderRight: last ? "none" : "0.5px solid var(--border)" }}>
      <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
