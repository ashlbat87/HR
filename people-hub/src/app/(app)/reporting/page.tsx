// Reporting & Insights — landing (v0.8, Stage 7b). HR-only. Insights Hub hierarchy:
// Executive Summary -> Key Highlights -> Explore Reports -> reserved AI slot (bottom).
// Reads the verified 7a query layer. Read-only. Built to the frozen wireframe (PD-009).

import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getReviewData, computeDistribution, computeGap, computeGroupComparison,
  buildExecutiveSummary,
} from "@/modules/performance/reporting-queries";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

function nowGST(): string {
  // GST is UTC+4, no DST. Format: "24 July 2026, 09:15 GST".
  const d = new Date(Date.now() + 4 * 3600 * 1000);
  const day = d.getUTCDate();
  const month = ["January","February","March","April","May","June","July","August","September","October","November","December"][d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm} GST`;
}

const REPORTS: { href: string; q: string }[] = [
  { href: "/reporting/performance", q: "How are performance ratings distributed?" },
  { href: "/reporting/values", q: "How are values ratings distributed?" },
  { href: "/reporting/gaps", q: "Where do employees and managers see performance differently?" },
  { href: "/reporting/departments", q: "Which departments differ from the organisation?" },
  { href: "/reporting/managers", q: "How do rating distributions vary by manager?" },
  { href: "/reporting/criterion", q: "How do ratings vary by performance criterion?" },
  { href: "/reporting/completion", q: "How complete is the current process?" },
  { href: "/reporting/accountability", q: "How are managers participating and following through?" },
];

export default async function ReportingLandingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");
  const sp = await searchParams;

  const scope = await resolveScope("PERFORMANCE", { cycle: sp.cycle, scope: sp.scope, period: sp.period });
  if (!scope) {
    return (
      <div>
        <h1 style={{ marginBottom: 4 }}>Reporting &amp; Insights</h1>
        <div className="empty">No review period is set up yet.</div>
      </div>
    );
  }
  const cycles = await getCyclesForDimension(scope.periodId, "PERFORMANCE");
  const yearAvail = await fullYearAvailable(scope.periodId, "PERFORMANCE");
  const scopeQs = scope.kind === "cycle" ? `?cycle=${scope.cycleId}` : `?period=${scope.periodId}&scope=year`;
  const perf = await getReviewData("PERFORMANCE", scopeToQuery(scope));
  const perfDist = computeDistribution("PERFORMANCE", perf);
  const perfGap = computeGap("PERFORMANCE", perf);
  const perfByDept = computeGroupComparison("PERFORMANCE", perf, "department");
  const summary = buildExecutiveSummary({
    dimensionLabel: "Performance", distribution: perfDist, gap: perfGap,
    groups: perfByDept, groupKind: "department",
  });

  const refreshed = nowGST();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Reporting &amp; Insights</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            {scope.kind === "cycle" ? `Showing: ${scope.cycleLabel}` : `Showing: Full year ${scope.periodLabel} (pooled)`}
          </p>
        </div>
        <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", marginTop: 6 }}>Last refreshed: {refreshed}</div>
      </div>

      <div style={{ marginTop: 12, marginBottom: 4 }}>
        <ScopeSelector
          cycles={cycles.map((c) => ({ id: c.id, label: c.label, isOpen: c.isOpen, meaningful: c.meaningful }))}
          fullYearAvailable={yearAvail}
          currentKind={scope.kind}
          currentCycleId={scope.kind === "cycle" ? scope.cycleId : undefined}
          periodLabel={scope.periodLabel}
        />
      </div>

      {/* Executive summary */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: 20 }}>
        <div style={{ width: 3, height: 20, background: "var(--purple)", borderRadius: 2 }} />
        <h2 style={{ margin: 0, fontSize: 17 }}>Executive summary</h2>
        <span className="muted" style={{ fontSize: 12 }}>Performance · rule-based</span>
      </div>
      <div className="card">
        <SummaryBlock label="What happened" lines={summary.whatHappened} />
        <SummaryBlock label="What HR should know" lines={summary.whatToKnow} />
        <SummaryBlock label="What HR should do" lines={summary.whatToDo} />
      </div>

      {/* Key highlights */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: 28 }}>
        <div style={{ width: 3, height: 20, background: "var(--purple)", borderRadius: 2 }} />
        <h2 style={{ margin: 0, fontSize: 17 }}>Key highlights</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <Highlight label="Avg performance rating" value={perfDist.average != null ? perfDist.average.toFixed(1) : "—"} basis={perfDist.total} />
        <Highlight label="% at 4–5" value={perfDist.total ? `${Math.round(perfDist.pctAt4or5)}%` : "—"} basis={perfDist.total} />
        <Highlight label="Avg self–manager gap" value={perfGap.averageGap != null ? (perfGap.averageGap >= 0 ? "+" : "") + perfGap.averageGap.toFixed(1) : "—"} basis={perfGap.total} />
      </div>

      {/* Explore reports */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: 28 }}>
        <div style={{ width: 3, height: 20, background: "var(--purple)", borderRadius: 2 }} />
        <h2 style={{ margin: 0, fontSize: 17 }}>Explore reports</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {REPORTS.map((r) => (
          <Link key={r.href} href={`${r.href}${scopeQs}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit", marginBottom: 0 }}>
            <span style={{ fontWeight: 500 }}>{r.q}</span>
          </Link>
        ))}
      </div>

      {/* Reserved AI slot (bottom) */}
      <div style={{ marginTop: 28, border: "0.5px dashed var(--border)", borderRadius: 8, padding: "12px 14px" }}>
        <span className="muted" style={{ fontSize: 12 }}>Reserved for a future AI summary. Not enabled in this version.</span>
      </div>
    </div>
  );
}

function SummaryBlock({ label, lines }: { label: string; lines: string[] }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      {lines.map((l, i) => <div key={i} style={{ fontSize: 14, lineHeight: 1.6 }}>{l}</div>)}
    </div>
  );
}

function Highlight({ label, value, basis }: { label: string; value: string; basis: number }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11 }}>based on {basis} review{basis === 1 ? "" : "s"}</div>
    </div>
  );
}
