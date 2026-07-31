// Self-vs-manager gap analysis (v0.8, Stage 7f redesign). Answers "where do employees and
// managers see performance differently?" with a NARRATIVE: executive summary -> DIRECTION of
// disagreement (the centrepiece) -> size -> where (by department). Neutral throughout; no
// implication either side is right; direction/size/department all drillable. Department-level
// only for "where" (manager-level excluded — reads as evaluating managers, PD-008).

import Link from "next/link";
import { getGapDirection } from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

const TITLE = "Where do employees and managers see performance differently?";

const SEG = {
  employeeHigher: "var(--purple-subtle)",
  agreed: "var(--purple)",
  managerHigher: "var(--purple-dark)",
  size1: "var(--purple-subtle)",
  size2: "var(--purple-dark)",
  size0: "var(--purple)",
};

export async function GapAnalysisView({ params }: { params: { cycle?: string; scope?: string; period?: string } }) {
  const scope = await resolveScope("PERFORMANCE", params);
  if (!scope) {
    return (
      <div>
        <div className="section-label"><span className="bar" /><h2>{TITLE}</h2></div>
        <div className="empty">No review period is set up yet.</div>
      </div>
    );
  }

  const cycles = await getCyclesForDimension(scope.periodId, "PERFORMANCE");
  const yearAvail = await fullYearAvailable(scope.periodId, "PERFORMANCE");
  const rep = await getGapDirection(scopeToQuery(scope));

  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const timeframeStatement = scope.kind === "cycle" ? scope.cycleLabel : `Full year ${scope.periodLabel} (pooled)`;
  const drillBase = `/reporting/drilldown?dimension=PERFORMANCE${scopeQs}`;

  const total = rep.total;
  const g = rep.averageGap;
  const agreedPct = total ? Math.round((rep.direction.agreed / total) * 100) : 0;

  const line1 = `${agreedPct}% of reviews resulted in the same rating.`;
  const line2 = g == null || Math.abs(g) < 0.05
    ? "On average, employee self-ratings and manager ratings are level."
    : g < 0
      ? `Employee self-ratings average ${Math.abs(g).toFixed(1)} higher than manager ratings.`
      : `Manager ratings average ${g.toFixed(1)} higher than employee self-ratings.`;
  const line3 = rep.size.twoPlus === 0
    ? "No reviews differed by two or more rating levels."
    : `${rep.size.twoPlus} review${rep.size.twoPlus === 1 ? "" : "s"} differed by two or more rating levels.`;

  const dirSegs = [
    { key: "employeeHigher", label: "Employee rated higher", n: rep.direction.employeeHigher, color: SEG.employeeHigher },
    { key: "agreed", label: "Agreed", n: rep.direction.agreed, color: SEG.agreed },
    { key: "managerHigher", label: "Manager rated higher", n: rep.direction.managerHigher, color: SEG.managerHigher },
  ];
  const sizeSegs = [
    { key: "zero", label: "Same rating", n: rep.size.zero, color: SEG.size0 },
    { key: "one", label: "One level apart", n: rep.size.one, color: SEG.size1 },
    { key: "twoPlus", label: "Two or more apart", n: rep.size.twoPlus, color: SEG.size2 },
  ];

  const deptMax = Math.max(0.01, ...rep.byDepartment.map((d) => Math.abs(d.averageGap)));

  return (
    <div>
      <div className="rpt-masthead">
        <div className="intro">
          <h1 style={{ margin: 0 }}>{TITLE}</h1>
          <p style={{ marginTop: 6 }}>
            <Link href="/reporting">Reporting &amp; Insights</Link> › Self vs manager gaps
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
          <div className="tsub"><b>{total}</b> review{total === 1 ? "" : "s"} with both ratings</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>{timeframeStatement}</span>
        <a href={`/reporting/export?report=gaps&dimension=PERFORMANCE${scopeQs}`} className="btn secondary" style={{ padding: "6px 14px", fontSize: 13 }}>Export CSV</a>
      </div>

      {total === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>No reviews have both a self and a manager rating for this timeframe.</div>
      ) : (
        <>
          <div className="section-label"><span className="bar" /><h2>Summary</h2></div>
          <div className="exec-summary">
            <div className="row"><div className="rlabel">Agreement</div><div className="rbody">{line1}</div></div>
            <div className="row"><div className="rlabel">Direction</div><div className="rbody">{line2}</div></div>
            <div className="row"><div className="rlabel">Extremes</div><div className="rbody">{line3}</div></div>
          </div>

          <div className="section-label"><span className="bar" /><h2>Direction of disagreement</h2></div>
          <div className="card">
            <SegmentedBar segs={dirSegs} total={total} drillBase={drillBase} param="direction" />
          </div>

          <div className="section-label"><span className="bar" /><h2>Size of disagreement</h2></div>
          <div className="card">
            <SegmentedBar segs={sizeSegs} total={total} drillBase={drillBase} param="gap" />
          </div>

          <div className="section-label"><span className="bar" /><h2>Where the gaps are (by department)</h2></div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", padding: "10px 16px", borderBottom: "0.5px solid var(--border)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted)" }}>
              <span style={{ flex: 2 }}>Department</span>
              <span style={{ flex: 3 }}>Average gap (manager − self)</span>
              <span style={{ flex: 1, textAlign: "right" }}>Reviews</span>
            </div>
            {rep.byDepartment.map((d) => {
              const v = d.averageGap;
              const w = Math.round((Math.abs(v) / deptMax) * 46);
              const lean = v > 0.05 ? "Manager higher" : v < -0.05 ? "Employee higher" : "Level";
              return (
                <Link key={d.department} href={`${drillBase}&group=department&value=${encodeURIComponent(d.department)}`}
                  style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "0.5px solid var(--n20)", textDecoration: "none", color: "inherit" }}>
                  <span style={{ flex: 2, fontWeight: 500 }}>{d.department}</span>
                  <span style={{ flex: 3, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ position: "relative", flex: 1, height: 10, background: "var(--n20)", borderRadius: 5 }}>
                      <span style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: "var(--n40)" }} />
                      <span style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 5,
                        left: v >= 0 ? "50%" : `${50 - w}%`, width: `${w}%`,
                        background: v >= 0 ? "var(--purple-dark)" : "var(--purple)" }} />
                    </span>
                    <span className="muted" style={{ fontSize: 12.5, minWidth: 108 }}>{v >= 0 ? "+" : ""}{v.toFixed(1)} · {lean}</span>
                  </span>
                  <span style={{ flex: 1, textAlign: "right" }} className="muted">{d.n}</span>
                </Link>
              );
            })}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Positive values mean managers rated higher; negative means employees rated themselves higher. Click any row or segment to view the underlying reviews.</div>
        </>
      )}
    </div>
  );
}

function SegmentedBar({ segs, total, drillBase, param }: {
  segs: { key: string; label: string; n: number; color: string }[];
  total: number; drillBase: string; param: "direction" | "gap";
}) {
  return (
    <div>
      <div style={{ display: "flex", height: 34, borderRadius: 6, overflow: "hidden", border: "0.5px solid var(--border)" }}>
        {segs.map((s) => {
          const pct = total ? (s.n / total) * 100 : 0;
          if (s.n === 0) return null;
          return (
            <Link key={s.key} href={`${drillBase}&${param}=${s.key}`} title={`${s.label}: ${s.n}`}
              style={{ width: `${pct}%`, background: s.color, display: "flex", alignItems: "center", justifyContent: "center",
                color: s.color === "var(--purple-subtle)" ? "var(--purple-dark)" : "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", minWidth: 28 }}>
              {Math.round(pct)}%
            </Link>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
        {segs.map((s) => (
          <Link key={s.key} href={`${drillBase}&${param}=${s.key}`} style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", color: "inherit" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, border: "0.5px solid var(--border)" }} />
            <span style={{ fontSize: 13 }}>{s.label}</span>
            <span className="muted" style={{ fontSize: 13 }}>{s.n}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
