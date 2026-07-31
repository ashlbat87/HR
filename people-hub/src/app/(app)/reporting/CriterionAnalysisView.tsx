// Performance criterion analysis (v0.8, Stage 7f design retrofit). Diagnostic layer (PD-018):
// per criterion (Impact/Quality/Delivery) average, distribution, % at 4-5, drillable. Reads
// MANAGER item scores directly (PD-026, unaffected by v0.9 moderation). Adopts the reporting
// design system (PD-027). DATA/BEHAVIOUR UNCHANGED.

import Link from "next/link";
import { getCriterionBreakdown } from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };
const TITLE = "How do ratings vary by performance criterion?";

export async function CriterionAnalysisView({ params }: { params: { cycle?: string; scope?: string; period?: string } }) {
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
  const breakdown = await getCriterionBreakdown(scopeToQuery(scope));

  const scopeQs = scope.kind === "cycle" ? `&cycle=${scope.cycleId}` : `&period=${scope.periodId}&scope=year`;
  const timeframeStatement = scope.kind === "cycle" ? scope.cycleLabel : `Full year ${scope.periodLabel} (pooled)`;
  const population = Math.max(0, ...breakdown.map((c) => c.n));
  const empty = breakdown.every((c) => c.n === 0);

  return (
    <div>
      <div className="rpt-masthead">
        <div className="intro">
          <h1 style={{ margin: 0 }}>{TITLE}</h1>
          <p style={{ marginTop: 6 }}>
            <Link href="/reporting">Reporting &amp; Insights</Link> › Performance criterion analysis
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
        <a href={`/reporting/export?report=criterion&dimension=PERFORMANCE${scopeQs}`} className="btn secondary" style={{ padding: "6px 14px", fontSize: 13 }}>Export CSV</a>
      </div>

      {empty ? (
        <div className="empty" style={{ marginTop: 16 }}>No completed performance ratings for this timeframe yet.</div>
      ) : (
        <>
          <div className="section-label"><span className="bar" /><h2>By criterion</h2></div>
          {breakdown.map((c) => {
            const maxCount = Math.max(1, ...([1, 2, 3, 4, 5] as const).map((l) => c.counts[l]));
            const drillBase = `/reporting/drilldown?dimension=PERFORMANCE${scopeQs}&criterion=${c.item}`;
            return (
              <div key={c.item} className="card">
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 3 }}>{c.label}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    <span style={{ color: "var(--purple-dark)", fontWeight: 600 }}>{c.average != null ? c.average.toFixed(1) : "—"}</span> average · {Math.round(c.pctAt4or5)}% at 4–5 · {c.n} review{c.n === 1 ? "" : "s"}
                  </div>
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
          })}
          <div className="muted" style={{ textAlign: "center", fontSize: 11, marginTop: 4 }}>Click any rating to view the underlying reviews.</div>
        </>
      )}
    </div>
  );
}
