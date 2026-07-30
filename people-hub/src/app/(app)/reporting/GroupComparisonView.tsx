// Shared group-comparison view (v0.8, Stage 7c). Department / function / manager comparisons
// share this shape ("where do patterns differ?"). Neutral language; "based on N"; drill-down
// per group; performance/values separate. Uses computeGroupComparison from the 7a layer.

import Link from "next/link";
import {
  getReviewData, computeGroupComparison, type RatingDimension, type GroupBy,
} from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

function nowGST(): string {
  const d = new Date(Date.now() + 4 * 3600 * 1000);
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}, ${hh}:${mm} GST`;
}

const GROUP_NOUN: Record<GroupBy, string> = { department: "department", func: "function", manager: "manager" };

export async function GroupComparisonView({ dimension, groupBy, title, params }: { dimension: RatingDimension; groupBy: GroupBy; title: string; params: { cycle?: string; scope?: string; period?: string } }) {
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
  const groups = computeGroupComparison(dimension, data, groupBy);
  const orgAvg = data.length ? data.reduce((a, d) => a + d.managerScore, 0) / data.length : null;
  const noun = GROUP_NOUN[groupBy];
  const refreshed = nowGST();
  const maxAvg = 5;

  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const drillBase = `/reporting/drilldown?dimension=${dimension}${scopeQs}&group=${groupBy}`;
  const pooledList = cycles.map((c) => c.label).join(", ");
  const timeframeLabel = scope.kind === "cycle" ? `Showing: ${scope.cycleLabel}` : `Showing: Full year ${scope.periodLabel} — pooled across ${cycles.length} ${dimLabel.toLowerCase()} cycle${cycles.length === 1 ? "" : "s"}: ${pooledList}`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>{title}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginLeft: 13, marginBottom: 14 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          <Link href="/reporting">Reporting &amp; Insights</Link> › {title}
        </span>
        <span className="muted" style={{ fontSize: 11, opacity: 0.7 }}>Last refreshed {refreshed}</span>
      </div>

      {groups.length === 0 ? (
        <div className="empty">No completed {dimLabel.toLowerCase()} ratings match these filters yet.</div>
      ) : (
        <>
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 14, fontSize: 13, lineHeight: 1.55 }}>
            <span className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Overview</span>
            <span> · {dimLabel} ratings compared across {groups.length} {noun}{groups.length === 1 ? "" : "s"}. Organisational average {orgAvg != null ? orgAvg.toFixed(1) : "—"}.</span>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", alignSelf: "center" }}>Filters</span>
            <span className="chip">Timeframe: {scope.kind === "cycle" ? scope.cycleLabel : `Full year ${scope.periodLabel}`}</span>
            <span className="chip">Type: {dimLabel}</span>
            <span className="chip">Grouped by: {noun}</span>
          </div>

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
