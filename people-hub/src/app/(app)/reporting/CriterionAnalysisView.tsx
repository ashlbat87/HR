// Performance criterion analysis (v0.8, Stage 7c). Diagnostic layer (PD-018): per criterion
// (Impact/Quality/Delivery) average, distribution, % at 4-5, completed count; each drillable.
// Reads MANAGER item scores directly (not the official-rating resolver), so unaffected by
// v0.9 moderation. Performance only. Neutral language. Honours the timeframe selector.

import Link from "next/link";
import { getCriterionBreakdown } from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

export async function CriterionAnalysisView({ params }: { params: { cycle?: string; scope?: string; period?: string } }) {
  const scope = await resolveScope("PERFORMANCE", params);
  if (!scope) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
          <h1 style={{ margin: 0 }}>How do ratings vary by performance criterion?</h1>
        </div>
        <div className="empty">No review period is set up yet.</div>
      </div>
    );
  }

  const cycles = await getCyclesForDimension(scope.periodId, "PERFORMANCE");
  const yearAvail = await fullYearAvailable(scope.periodId, "PERFORMANCE");
  const breakdown = await getCriterionBreakdown(scopeToQuery(scope));

  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const timeframeLabel = scope.kind === "cycle" ? `Showing: ${scope.cycleLabel}` : `Showing: Full year ${scope.periodLabel} (pooled)`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>How do ratings vary by performance criterion?</h1>
      </div>
      <div style={{ marginLeft: 13, marginBottom: 12 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          <Link href="/reporting">Reporting &amp; Insights</Link> › Performance criterion analysis
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
          <a href={`/reporting/export?report=criterion&dimension=PERFORMANCE${scopeQs}`} className="btn secondary" style={{ padding: "5px 12px", fontSize: 13 }}>Export CSV</a>
        </span>
      </div>

      {breakdown.every((c) => c.n === 0) ? (
        <div className="empty">No completed performance ratings for this timeframe yet.</div>
      ) : (
        breakdown.map((c) => {
          const maxCount = Math.max(1, ...([1, 2, 3, 4, 5] as const).map((l) => c.counts[l]));
          const drillBase = `/reporting/drilldown?dimension=PERFORMANCE${scopeQs}&criterion=${c.item}`;
          return (
            <div key={c.item} className="card">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{c.label}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  The average {c.label} rating is {c.average != null ? c.average.toFixed(1) : "—"}. {Math.round(c.pctAt4or5)}% at 4–5 · based on {c.n} review{c.n === 1 ? "" : "s"}.
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
                {([1, 2, 3, 4, 5] as const).map((l) => {
                  const cnt = c.counts[l];
                  const h = Math.round((cnt / maxCount) * 96);
                  return (
                    <Link key={l} href={`${drillBase}&level=${l}`} title="Click to view underlying reviews"
                      style={{ flex: 1, textAlign: "center", textDecoration: "none", color: "inherit" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{cnt}</div>
                      <div className="bar-drill" style={{ background: l >= 4 ? "var(--purple)" : "var(--purple-subtle)", height: Math.max(3, h), borderRadius: 4, transition: "opacity 0.12s ease" }} />
                      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{LEVEL_LABEL[l]}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
      {!breakdown.every((c) => c.n === 0) && (
        <div className="muted" style={{ textAlign: "center", fontSize: 11, marginTop: 4 }}>Click any rating to view the underlying reviews.</div>
      )}
    </div>
  );
}
