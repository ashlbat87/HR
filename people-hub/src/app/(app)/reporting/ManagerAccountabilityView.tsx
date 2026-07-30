// Manager Accountability (v0.8, Stage 7d). Participation/process only (PD-008): per manager,
// completion % and median completion time. NOT a measure of rating quality. Neutral, sorted
// by name (not a leaderboard). Honours the timeframe selector; drillable to each manager's
// reviews. Spans all review types (follow-through spans types).

import Link from "next/link";
import { getManagerParticipation } from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

export async function ManagerAccountabilityView({ params }: { params: { cycle?: string; scope?: string; period?: string } }) {
  const scope = await resolveScope("PERFORMANCE", params);
  if (!scope) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
          <h1 style={{ margin: 0 }}>How are managers participating and following through?</h1>
        </div>
        <div className="empty">No review period is set up yet.</div>
      </div>
    );
  }

  const cycles = await getCyclesForDimension(scope.periodId, "PERFORMANCE");
  const yearAvail = await fullYearAvailable(scope.periodId, "PERFORMANCE");
  const participation = await getManagerParticipation(scopeToQuery(scope));

  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const timeframeLabel = scope.kind === "cycle" ? `Showing: ${scope.cycleLabel}` : `Showing: Full year ${scope.periodLabel} (pooled)`;

  const totalAssigned = participation.reduce((a, m) => a + m.assigned, 0);
  const totalCompleted = participation.reduce((a, m) => a + m.completed, 0);
  const overallPct = totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>How are managers participating and following through?</h1>
      </div>
      <div style={{ marginLeft: 13, marginBottom: 12 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          <Link href="/reporting">Reporting &amp; Insights</Link> › Manager accountability
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <ScopeSelector
          cycles={cycles.map((c) => ({ id: c.id, label: c.label, isOpen: c.isOpen, meaningful: c.meaningful }))}
          fullYearAvailable={yearAvail}
          currentKind={scope.kind}
          currentCycleId={scope.kind === "cycle" ? scope.cycleId : undefined}
          periodLabel={scope.periodLabel}
        />
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="chip status-submitted" style={{ fontSize: 12 }}>{timeframeLabel}</span>
          <a href={`/reporting/export?report=accountability&dimension=PERFORMANCE${scopeQs}`} className="btn secondary" style={{ padding: "5px 12px", fontSize: 13 }}>Export CSV</a>
        </span>
      </div>

      {participation.length === 0 ? (
        <div className="empty">No reviews assigned to managers for this timeframe yet.</div>
      ) : (
        <>
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 14, fontSize: 13, lineHeight: 1.55 }}>
            <span className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Overview</span>
            <span> · {totalCompleted} of {totalAssigned} assigned reviews are complete across {participation.length} manager{participation.length === 1 ? "" : "s"} ({overallPct}%). This reflects participation and timeliness, not rating quality.</span>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", padding: "10px 14px", borderBottom: "0.5px solid var(--border)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted)" }}>
              <span style={{ flex: 2 }}>Manager</span>
              <span style={{ flex: 1, textAlign: "right" }}>Completed</span>
              <span style={{ flex: 1, textAlign: "right" }}>Completion</span>
              <span style={{ flex: 1, textAlign: "right" }}>Median time</span>
            </div>
            {participation.map((m) => (
              <Link key={m.managerId} href={`/reporting/drilldown?dimension=PERFORMANCE${scopeQs}&group=manager&value=${m.managerId}`}
                title="Click to view this manager's reviews"
                style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: "0.5px solid var(--n20)", textDecoration: "none", color: "inherit" }}>
                <span style={{ flex: 2, fontWeight: 500 }}>{m.managerName}</span>
                <span style={{ flex: 1, textAlign: "right" }}>{m.completed} / {m.assigned}</span>
                <span style={{ flex: 1, textAlign: "right" }}>{Math.round(m.completionPct)}%</span>
                <span style={{ flex: 1, textAlign: "right" }}>{m.medianDays != null ? `${m.medianDays.toFixed(1)} days` : "—"}</span>
              </Link>
            ))}
          </div>
          <div className="muted" style={{ textAlign: "center", fontSize: 11, marginTop: 12 }}>Click any manager to view their reviews. Median time is from employee submission to manager completion.</div>
        </>
      )}
    </div>
  );
}
