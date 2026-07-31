// Shared group-comparison view (v0.8, Stage 7f design retrofit). Department / manager
// comparisons ("where do patterns differ?"). Adopts the reporting design system (PD-027):
// report header + timeframe control, calm overview, group rows in a card. DATA/BEHAVIOUR
// UNCHANGED: scope, selector, drill-down, export, neutral diff-from-org chips (PD-025).

import Link from "next/link";
import {
  getReviewData, computeGroupComparison, type RatingDimension, type GroupBy,
} from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

const GROUP_NOUN: Record<GroupBy, string> = { department: "department", func: "function", manager: "manager" };

export async function GroupComparisonView({ dimension, groupBy, title, params }: { dimension: RatingDimension; groupBy: GroupBy; title: string; params: { cycle?: string; scope?: string; period?: string } }) {
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
  const groups = computeGroupComparison(dimension, data, groupBy);
  const orgAvg = data.length ? data.reduce((a, d) => a + d.managerScore, 0) / data.length : null;
  const noun = GROUP_NOUN[groupBy];
  const maxAvg = 5;

  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const drillBase = `/reporting/drilldown?dimension=${dimension}${scopeQs}&group=${groupBy}`;
  const pooledList = cycles.map((c) => c.label).join(", ");
  const timeframeStatement = scope.kind === "cycle"
    ? scope.cycleLabel
    : `Full year ${scope.periodLabel} — pooled across ${cycles.length} ${dimLabel.toLowerCase()} cycle${cycles.length === 1 ? "" : "s"}: ${pooledList}`;
  const population = data.length;

  return (
    <div>
      <div className="rpt-masthead">
        <div className="intro">
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p style={{ marginTop: 6 }}>
            <Link href="/reporting">Reporting &amp; Insights</Link> › {title}
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
        <a href={`/reporting/export?report=${groupBy}&dimension=${dimension}${scopeQs}`} className="btn secondary" style={{ padding: "6px 14px", fontSize: 13 }}>Export CSV</a>
      </div>

      {groups.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>No completed {dimLabel.toLowerCase()} ratings for this timeframe yet.</div>
      ) : (
        <>
          <div className="section-label"><span className="bar" /><h2>Overview</h2></div>
          <div className="exec-summary">
            <div className="row">
              <div className="rlabel">Comparison</div>
              <div className="rbody">{dimLabel} ratings compared across <span className="metric">{groups.length}</span> {noun}{groups.length === 1 ? "" : "s"}. Organisational average <span className="metric">{orgAvg != null ? orgAvg.toFixed(1) : "—"}</span>.</div>
            </div>
          </div>

          <div className="section-label"><span className="bar" /><h2>By {noun}</h2></div>
          <div className="card">
            {groups.map((g) => {
              const w = g.average != null ? Math.round((g.average / maxAvg) * 100) : 0;
              const diff = g.diffFromOrg;
              const diffLabel = diff == null ? "—" : `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} vs org`;
              return (
                <Link key={g.key} href={`${drillBase}&value=${encodeURIComponent(g.key)}`} title="Click to view underlying reviews"
                  style={{ display: "block", textDecoration: "none", color: "inherit", padding: "12px 0", borderBottom: "0.5px solid var(--n20)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 500 }}>{g.label}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{g.average != null ? g.average.toFixed(1) : "—"}</span>
                      <span className="chip">{diffLabel}</span>
                    </span>
                  </div>
                  <div style={{ height: 8, background: "var(--n20)", borderRadius: 4, overflow: "hidden" }}>
                    <div className="bar-drill" style={{ width: `${w}%`, height: "100%", background: "var(--purple)", transition: "opacity 0.12s ease" }} />
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>{Math.round(g.pctAt4or5)}% at 4–5 · based on {g.n} review{g.n === 1 ? "" : "s"}</div>
                </Link>
              );
            })}
            <div className="muted" style={{ textAlign: "center", fontSize: 11, marginTop: 12 }}>Click any {noun} to view the underlying reviews.</div>
          </div>
        </>
      )}
    </div>
  );
}
