// Self-vs-manager gap analysis (v0.8, Stage 7c). "Where do employees and managers see
// performance differently?" Neutral: describes the gap (manager minus self) and the
// distribution of gap sizes; no implication either side is right. Drillable; honours the
// timeframe selector; performance only.

import Link from "next/link";
import { getReviewData, computeGap } from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

export async function GapAnalysisView({ params }: { params: { cycle?: string; scope?: string; period?: string } }) {
  const scope = await resolveScope("PERFORMANCE", params);
  if (!scope) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
          <h1 style={{ margin: 0 }}>Where do employees and managers see performance differently?</h1>
        </div>
        <div className="empty">No review period is set up yet.</div>
      </div>
    );
  }

  const cycles = await getCyclesForDimension(scope.periodId, "PERFORMANCE");
  const yearAvail = await fullYearAvailable(scope.periodId, "PERFORMANCE");
  const data = await getReviewData("PERFORMANCE", scopeToQuery(scope));
  const gap = computeGap("PERFORMANCE", data);

  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const timeframeLabel = scope.kind === "cycle" ? `Showing: ${scope.cycleLabel}` : `Showing: Full year ${scope.periodLabel} (pooled)`;
  const drillBase = `/reporting/drilldown?dimension=PERFORMANCE${scopeQs}&gap=`;

  const g = gap.averageGap;
  const gapSentence = g == null
    ? "No reviews have both a self and a manager rating for this timeframe."
    : `On average, manager ratings are ${Math.abs(g).toFixed(1)} ${g >= 0 ? "higher than" : "lower than"} employee self-ratings.`;

  const buckets: { key: "zero" | "one" | "twoPlus"; label: string; n: number }[] = [
    { key: "zero", label: "Agreed (same rating)", n: gap.sizeDistribution.zero },
    { key: "one", label: "Differed by one level", n: gap.sizeDistribution.one },
    { key: "twoPlus", label: "Differed by two or more", n: gap.sizeDistribution.twoPlus },
  ];
  const maxN = Math.max(1, ...buckets.map((b) => b.n));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>Where do employees and managers see performance differently?</h1>
      </div>
      <div style={{ marginLeft: 13, marginBottom: 12 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          <Link href="/reporting">Reporting &amp; Insights</Link> › Self vs manager gaps
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
          <a href={`/reporting/export?report=gaps&dimension=PERFORMANCE${scopeQs}`} className="btn secondary" style={{ padding: "5px 12px", fontSize: 13 }}>Export CSV</a>
        </span>
      </div>

      {gap.total === 0 ? (
        <div className="empty">No reviews have both a self and a manager rating for this timeframe.</div>
      ) : (
        <>
          <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 14, fontSize: 13, lineHeight: 1.55 }}>
            <span className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Overview</span>
            <span> · {gapSentence} Based on {gap.total} review{gap.total === 1 ? "" : "s"} with both ratings.</span>
          </div>

          <div className="card">
            {buckets.map((b) => {
              const w = Math.round((b.n / maxN) * 100);
              return (
                <Link key={b.key} href={`${drillBase}${b.key}`} title="Click to view underlying reviews"
                  style={{ display: "block", textDecoration: "none", color: "inherit", padding: "12px 0", borderBottom: "0.5px solid var(--n20)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                    <span style={{ fontWeight: 500 }}>{b.label}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{b.n} review{b.n === 1 ? "" : "s"}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--n20)", borderRadius: 4, overflow: "hidden" }}>
                    <div className="bar-drill" style={{ width: `${w}%`, height: "100%", background: "var(--purple)", transition: "opacity 0.12s ease" }} />
                  </div>
                </Link>
              );
            })}
            <div className="muted" style={{ textAlign: "center", fontSize: 11, marginTop: 12 }}>Click any row to view the underlying reviews.</div>
          </div>
        </>
      )}
    </div>
  );
}
