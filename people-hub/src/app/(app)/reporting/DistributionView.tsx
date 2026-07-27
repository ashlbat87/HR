// Shared distribution view (v0.8, Stage 7b rev 4, 7c time-scoping). Chart is the hero;
// concise Executive Summary; KPI strip; clickable bars drill to underlying reviews; quiet
// metadata; first-class timeframe selector (PD-023); explicit pooled statement on full year
// (PD-025). HR-guarded by the calling page.

import Link from "next/link";
import {
  getReviewData, computeDistribution, computeGap, computeGroupComparison,
  buildExecutiveSummary, computeMedianOfficial, computeModeLevel, type RatingDimension,
} from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

function nowGST(): string {
  const d = new Date(Date.now() + 4 * 3600 * 1000);
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}, ${hh}:${mm} GST`;
}

export async function DistributionView({ dimension, title, params }: { dimension: RatingDimension; title: string; params: { cycle?: string; scope?: string; period?: string } }) {
  const dimLabel = dimension === "PERFORMANCE" ? "Performance" : "Values";

  const scope = await resolveScope(dimension, params);
  if (!scope) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
          <h1 style={{ margin: 0 }}>{title}</h1>
        </div>
        <div className="empty">No review period is set up yet.</div>
      </div>
    );
  }

  const cycles = await getCyclesForDimension(scope.periodId, dimension);
  const yearAvail = await fullYearAvailable(scope.periodId, dimension);
  const data = await getReviewData(dimension, scopeToQuery(scope));
  const dist = computeDistribution(dimension, data);
  const gap = dimension === "PERFORMANCE" ? computeGap(dimension, data) : null;
  const byDept = computeGroupComparison(dimension, data, "department");
  const summary = buildExecutiveSummary({ dimensionLabel: dimLabel, distribution: dist, gap, groups: byDept, groupKind: "department" });
  const median = computeMedianOfficial(data);
  const modeLevel = computeModeLevel(dist);

  const maxCount = Math.max(1, ...([1, 2, 3, 4, 5] as const).map((l) => dist.counts[l]));
  const refreshed = nowGST();
  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const drillBase = `/reporting/drilldown?dimension=${dimension}${scopeQs}`;
  const pooledList = cycles.map((c) => c.label).join(", ");
  const timeframeLabel = scope.kind === "cycle"
    ? `Showing: ${scope.cycleLabel}`
    : `Showing: Full year ${scope.periodLabel} — pooled across ${cycles.length} ${dimLabel.toLowerCase()} cycle${cycles.length === 1 ? "" : "s"}: ${pooledList}`;

  return (
    <div>
      {/* Header — title with quiet metadata */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>{title}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginLeft: 13, marginBottom: 12 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          <Link href="/reporting">Reporting &amp; Insights</Link> › {dimLabel} distribution
        </span>
        <span className="muted" style={{ fontSize: 11, opacity: 0.7 }}>Last refreshed {refreshed}</span>
      </div>

      {/* Timeframe selector (first-class filter) + explicit timeframe statement */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <ScopeSelector
          cycles={cycles.map((c) => ({ id: c.id, label: c.label, isOpen: c.isOpen, meaningful: c.meaningful }))}
          fullYearAvailable={yearAvail}
          currentKind={scope.kind}
          currentCycleId={scope.kind === "cycle" ? scope.cycleId : undefined}
          periodLabel={scope.periodLabel}
        />
        <span className="chip status-submitted" style={{ fontSize: 12 }}>{timeframeLabel}</span>
      </div>

      {dist.total === 0 ? (
        <div className="empty">No completed {dimLabel.toLowerCase()} ratings for {scope.kind === "cycle" ? scope.cycleLabel : `full year ${scope.periodLabel}`} yet.</div>
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
