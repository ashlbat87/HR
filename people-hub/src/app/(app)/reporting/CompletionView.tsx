// Completion funnel (v0.8, Stage 7d). Process view: how many scoped reviews sit at each
// stage (same classify() rules as the HR dashboard). All review types. Neutral. Honours the
// timeframe selector. Summary only (operational drill-down lives on the HR dashboard).

import Link from "next/link";
import { getCompletionFunnel } from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

export async function CompletionView({ params }: { params: { cycle?: string; scope?: string; period?: string } }) {
  const scope = await resolveScope("PERFORMANCE", params);
  if (!scope) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
          <h1 style={{ margin: 0 }}>How complete is the current process?</h1>
        </div>
        <div className="empty">No review period is set up yet.</div>
      </div>
    );
  }

  const cycles = await getCyclesForDimension(scope.periodId, "PERFORMANCE");
  const yearAvail = await fullYearAvailable(scope.periodId, "PERFORMANCE");
  const { stages, total } = await getCompletionFunnel(scopeToQuery(scope));

  const timeframeLabel = scope.kind === "cycle" ? `Showing: ${scope.cycleLabel}` : `Showing: Full year ${scope.periodLabel} (pooled)`;
  const done = stages.find((s) => s.key === "done")?.count ?? 0;
  const donePct = total ? Math.round((done / total) * 100) : 0;
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>How complete is the current process?</h1>
      </div>
      <div style={{ marginLeft: 13, marginBottom: 12 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          <Link href="/reporting">Reporting &amp; Insights</Link> › Completion
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
        <span className="chip status-submitted" style={{ fontSize: 12 }}>{timeframeLabel}</span>
      </div>

      {total === 0 ? (
        <div className="empty">No reviews for this timeframe yet.</div>
      ) : (
        <>
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 14, fontSize: 13, lineHeight: 1.55 }}>
            <span className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Overview</span>
            <span> · {done} of {total} review{total === 1 ? "" : "s"} complete ({donePct}%). The remainder are at earlier stages, shown below.</span>
          </div>

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
