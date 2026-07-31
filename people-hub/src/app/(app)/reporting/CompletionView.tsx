// Completion funnel (v0.8, Stage 7f design retrofit). Process view: how many scoped reviews
// sit at each stage (same classify() rules as the HR dashboard). All review types. Neutral.
// Summary only (operational drill-down lives on the HR dashboard). Adopts the reporting design
// system (PD-027). DATA/BEHAVIOUR UNCHANGED.

import Link from "next/link";
import { getCompletionFunnel } from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

const TITLE = "How complete is the current process?";

export async function CompletionView({ params }: { params: { cycle?: string; scope?: string; period?: string } }) {
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
  const { stages, total } = await getCompletionFunnel(scopeToQuery(scope));

  const timeframeStatement = scope.kind === "cycle" ? scope.cycleLabel : `Full year ${scope.periodLabel} (pooled)`;
  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const done = stages.find((s) => s.key === "done")?.count ?? 0;
  const donePct = total ? Math.round((done / total) * 100) : 0;
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div>
      <div className="rpt-masthead">
        <div className="intro">
          <h1 style={{ margin: 0 }}>{TITLE}</h1>
          <p style={{ marginTop: 6 }}>
            <Link href="/reporting">Reporting &amp; Insights</Link> › Completion
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
          <div className="tsub"><b>{done}</b> of {total} complete</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>{timeframeStatement}</span>
        <a href={`/reporting/export?report=completion&dimension=PERFORMANCE${scopeQs}`} className="btn secondary" style={{ padding: "6px 14px", fontSize: 13 }}>Export CSV</a>
      </div>

      {total === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>No reviews for this timeframe yet.</div>
      ) : (
        <>
          <div className="section-label"><span className="bar" /><h2>Overview</h2></div>
          <div className="exec-summary">
            <div className="row">
              <div className="rlabel">Progress</div>
              <div className="rbody"><span className="metric">{done}</span> of {total} review{total === 1 ? "" : "s"} complete (<span className="metric">{donePct}%</span>). The remainder are at earlier stages, shown below.</div>
            </div>
          </div>

          <div className="section-label"><span className="bar" /><h2>By stage</h2></div>
          <div className="card">
            {stages.map((s) => {
              const w = Math.round((s.count / maxCount) * 100);
              return (
                <div key={s.key} style={{ padding: "12px 0", borderBottom: "0.5px solid var(--n20)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 500 }}>{s.label}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{s.count} review{s.count === 1 ? "" : "s"}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--n20)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${w}%`, height: "100%", background: s.key === "done" ? "var(--purple)" : "var(--purple-subtle)", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
            <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>For operational follow-up on specific reviews, use the HR Dashboard.</div>
          </div>
        </>
      )}
    </div>
  );
}
