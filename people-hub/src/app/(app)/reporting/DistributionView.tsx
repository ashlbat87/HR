// Shared distribution view (v0.8, Stage 7f design retrofit). Adopts the reporting design
// system (docs/REPORTING_DESIGN_SYSTEM.md, PD-027): report header + timeframe control,
// .kpi-strip, calm summary, chart hero in a card. DATA/BEHAVIOUR UNCHANGED from 7c.

import Link from "next/link";
import {
  getReviewData, computeDistribution, computeGap, computeGroupComparison,
  buildExecutiveSummary, computeMedianOfficial, computeModeLevel, type RatingDimension,
} from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

export async function DistributionView({ dimension, title, params }: { dimension: RatingDimension; title: string; params: { cycle?: string; scope?: string; period?: string } }) {
  const dimLabel = dimension === "PERFORMANCE" ? "Performance" : "Values";

  const scope = await resolveScope(dimension, params);
  if (!scope) {
    return (
      <div>
        <div className="section-label"><span className="bar" /><h2>{title}</h2></div>
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
  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const drillBase = `/reporting/drilldown?dimension=${dimension}${scopeQs}`;
  const pooledList = cycles.map((c) => c.label).join(", ");
  const timeframeStatement = scope.kind === "cycle"
    ? scope.cycleLabel
    : `Full year ${scope.periodLabel} — pooled across ${cycles.length} ${dimLabel.toLowerCase()} cycle${cycles.length === 1 ? "" : "s"}: ${pooledList}`;
  const population = dist.total;
  const basisSub = `Based on ${population} review${population === 1 ? "" : "s"}`;

  return (
    <div>
      <div className="rpt-masthead">
        <div className="intro">
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p style={{ marginTop: 6 }}>
            <Link href="/reporting">Reporting &amp; Insights</Link> › {dimLabel} distribution
          </p>
        </div>
        <div className="timeframe-box">
          <div className="tlabel">Showing</div>
          <ScopeSelector
            cycles={cycles.map((c) => ({ id: c.id, label: c.label, isOpen: c.isOpen, meaningful: c.meaningful }))}
            fullYearAvailable={yearAvail}
            currentKind={scope.kind}
            currentCycleId={scope.kind === "cycle" ? scope.cycleId : undefined}
            periodLabel={scope.periodLabel}
          />
          <div className="tsub"><b>{population}</b> completed review{population === 1 ? "" : "s"}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>{timeframeStatement}</span>
        <a href={`/reporting/export?report=distribution&dimension=${dimension}${scopeQs}`} className="btn secondary" style={{ padding: "6px 14px", fontSize: 13 }}>Export CSV</a>
      </div>

      {dist.total === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>No completed {dimLabel.toLowerCase()} ratings for {scope.kind === "cycle" ? scope.cycleLabel : `full year ${scope.periodLabel}`} yet.</div>
      ) : (
        <>
          <div className="section-label"><span className="bar" /><h2>Summary</h2></div>
          <div className="exec-summary">
            <SummaryRow label="What happened" lines={summary.whatHappened} />
            <SummaryRow label="What HR should know" lines={summary.whatToKnow} />
            <SummaryRow label="What HR should do" lines={summary.whatToDo} />
          </div>

          <div className="section-label"><span className="bar" /><h2>Key metrics</h2></div>
          <div className="kpi-strip">
            <div className="kpi-card"><div className="v">{dist.average != null ? dist.average.toFixed(1) : "—"}</div><div className="k">Average rating</div><div className="sub">{basisSub}</div></div>
            <div className="kpi-card"><div className="v">{median != null ? median.toFixed(1) : "—"}</div><div className="k">Median rating</div><div className="sub">{basisSub}</div></div>
            <div className="kpi-card small"><div className="v">{modeLevel != null ? LEVEL_LABEL[modeLevel] : "—"}</div><div className="k">Most common</div><div className="sub">{basisSub}</div></div>
            <div className="kpi-card"><div className="v">{`${Math.round(dist.pctAt4or5)}%`}</div><div className="k">% Rated 4–5</div><div className="sub">{basisSub}</div></div>
            <div className="kpi-card"><div className="v">{String(dist.total)}</div><div className="k">Completed reviews</div><div className="sub">This cycle</div></div>
          </div>

          <div className="section-label"><span className="bar" /><h2>Distribution</h2></div>
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

function SummaryRow({ label, lines }: { label: string; lines: string[] }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div className="row">
      <div className="rlabel">{label}</div>
      <div className="rbody">{lines.join(" ")}</div>
    </div>
  );
}
