// Manager Accountability (v0.8, Stage 7f design retrofit). Participation/process ONLY
// (PD-008): per manager, completion % and median completion time. NOT rating quality. Neutral,
// sorted by name (not a leaderboard). Adopts the reporting design system (PD-027) + a thin
// per-row completion bar (structural, visualises the % already shown — not evaluative).
// DATA/BEHAVIOUR UNCHANGED.

import Link from "next/link";
import { getManagerParticipation } from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

const TITLE = "How are managers participating and following through?";

export async function ManagerAccountabilityView({ params }: { params: { cycle?: string; scope?: string; period?: string } }) {
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
  const participation = await getManagerParticipation(scopeToQuery(scope));

  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const timeframeStatement = scope.kind === "cycle" ? scope.cycleLabel : `Full year ${scope.periodLabel} (pooled)`;

  const totalAssigned = participation.reduce((a, m) => a + m.assigned, 0);
  const totalCompleted = participation.reduce((a, m) => a + m.completed, 0);
  const overallPct = totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <div>
      <div className="rpt-masthead">
        <div className="intro">
          <h1 style={{ margin: 0 }}>{TITLE}</h1>
          <p style={{ marginTop: 6 }}>
            <Link href="/reporting">Reporting &amp; Insights</Link> › Manager accountability
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
          <div className="tsub"><b>{totalCompleted}</b> of {totalAssigned} complete</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>{timeframeStatement}</span>
        <a href={`/reporting/export?report=accountability&dimension=PERFORMANCE${scopeQs}`} className="btn secondary" style={{ padding: "6px 14px", fontSize: 13 }}>Export CSV</a>
      </div>

      {participation.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>No reviews assigned to managers for this timeframe yet.</div>
      ) : (
        <>
          <div className="section-label"><span className="bar" /><h2>Overview</h2></div>
          <div className="exec-summary">
            <div className="row">
              <div className="rlabel">Participation</div>
              <div className="rbody"><span className="metric">{totalCompleted}</span> of {totalAssigned} assigned reviews are complete across {participation.length} manager{participation.length === 1 ? "" : "s"} (<span className="metric">{overallPct}%</span>). This reflects participation and timeliness, not rating quality.</div>
            </div>
          </div>

          <div className="section-label"><span className="bar" /><h2>By manager</h2></div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", padding: "10px 16px", borderBottom: "0.5px solid var(--border)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted)" }}>
              <span style={{ flex: 2 }}>Manager</span>
              <span style={{ flex: 3 }}>Completion</span>
              <span style={{ flex: 1, textAlign: "right" }}>Completed</span>
              <span style={{ flex: 1, textAlign: "right" }}>Median time</span>
            </div>
            {participation.map((m) => {
              const pct = Math.round(m.completionPct);
              return (
                <Link key={m.managerId} href={`/reporting/drilldown?dimension=PERFORMANCE${scopeQs}&group=manager&value=${m.managerId}`}
                  title="Click to view this manager's reviews"
                  style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "0.5px solid var(--n20)", textDecoration: "none", color: "inherit" }}>
                  <span style={{ flex: 2, fontWeight: 500 }}>{m.managerName}</span>
                  <span style={{ flex: 3, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, height: 8, background: "var(--n20)", borderRadius: 4, overflow: "hidden" }}>
                      <span style={{ display: "block", width: `${pct}%`, height: "100%", background: "var(--purple)", borderRadius: 4 }} />
                    </span>
                    <span className="muted" style={{ fontSize: 12.5, minWidth: 34, textAlign: "right" }}>{pct}%</span>
                  </span>
                  <span style={{ flex: 1, textAlign: "right" }} className="muted">{m.completed} / {m.assigned}</span>
                  <span style={{ flex: 1, textAlign: "right" }} className="muted">{m.medianDays != null ? `${m.medianDays.toFixed(1)} days` : "—"}</span>
                </Link>
              );
            })}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Click any manager to view their reviews. Median time is from employee submission to manager completion.</div>
        </>
      )}
    </div>
  );
}
