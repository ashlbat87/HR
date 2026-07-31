// Reporting & Insights — landing (v0.8, Stage 7f). HR-only. Reference implementation of the
// module design system (docs/REPORTING_DESIGN_SYSTEM.md, PD-027). Data wiring unchanged from
// 7b/7c; presentation rebuilt: masthead + primary timeframe control, one calm executive
// summary, five-KPI strip with population subtitles, neutral Needs Attention (threshold-
// driven), grouped report cards (Performance / Process / Values), primaries first.

import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getReviewData, computeDistribution, computeGap, computeGroupComparison,
  buildExecutiveSummary, computeMedianOfficial, computeModeLevel,
  getCompletionFunnel,
} from "@/modules/performance/reporting-queries";
import { getInsightRules } from "@/modules/performance/insight-rules";
import { resolveScope, scopeToQuery, getCyclesForDimension, fullYearAvailable } from "@/modules/performance/reporting-scope";
import { ScopeSelector } from "./ScopeSelector";

const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

type Card = { href: string; title: string; desc: string; meta: string; icon: React.ReactNode };

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
  const median = computeMedianOfficial(perf);
  const modeLevel = computeModeLevel(perfDist);
  const summary = buildExecutiveSummary({
    dimensionLabel: "Performance", distribution: perfDist, gap: perfGap,
    groups: perfByDept, groupKind: "department",
  });

  const rules = getInsightRules();
  const funnel = await getCompletionFunnel(scopeToQuery(scope));
  const incomplete = funnel.stages.filter((s) => s.key !== "done").reduce((a, s) => a + s.count, 0);
  const deptsOver = perfByDept.filter((d) => d.diffFromOrg != null && Math.abs(d.diffFromOrg) > rules.departmentVarianceThreshold);

  const attention: { text: React.ReactNode; href: string }[] = [];
  if (deptsOver.length > 0) {
    attention.push({
      href: `/reporting/departments${scopeQs}`,
      text: <><b>{deptsOver.length} department{deptsOver.length === 1 ? "" : "s"}</b> differ from the organisational average by more than {rules.departmentVarianceThreshold.toFixed(1)} of a rating point.</>,
    });
  }
  if (perfGap.averageGap != null && Math.abs(perfGap.averageGap) >= 0.1) {
    const dir = perfGap.averageGap >= 0 ? "higher" : "lower";
    attention.push({
      href: `/reporting/gaps${scopeQs}`,
      text: <>Average manager rating is <b>{Math.abs(perfGap.averageGap).toFixed(1)} {dir}</b> than average self rating this cycle.</>,
    });
  }
  if (incomplete > 0) {
    attention.push({
      href: `/reporting/completion${scopeQs}`,
      text: <><b>{incomplete} review{incomplete === 1 ? "" : "s"}</b> remain incomplete in the current timeframe.</>,
    });
  }

  const population = perfDist.total;
  const basisSub = `Based on ${population} review${population === 1 ? "" : "s"}`;

  const perfCards: Card[] = [
    { href: "/reporting/performance", title: "Performance distribution", desc: "How manager performance ratings are distributed across the selected cycle.", meta: `${population} reviews`, icon: iconBars() },
    { href: "/reporting/departments", title: "Department comparison", desc: "Which departments differ from the organisational average.", meta: `${perfByDept.length} departments analysed`, icon: iconCompare() },
    { href: "/reporting/gaps", title: "Self vs manager", desc: "Where employees and managers see performance differently.", meta: `${perfGap.total} reviews compared`, icon: iconGap() },
    { href: "/reporting/criterion", title: "Performance criteria", desc: "How ratings vary across Impact, Quality and Delivery.", meta: "3 criteria", icon: iconRows() },
    { href: "/reporting/managers", title: "Manager comparison", desc: "How rating distributions vary by manager.", meta: "By manager", icon: iconPeople() },
  ];
  const processCards: Card[] = [
    { href: "/reporting/completion", title: "Completion analytics", desc: "How complete the current review process is, by stage.", meta: `${funnel.total} reviews tracked`, icon: iconCheck() },
    { href: "/reporting/accountability", title: "Manager accountability", desc: "How managers are participating and following through. Timeliness, not quality.", meta: "By manager", icon: iconCheck() },
  ];
  const valuesCards: Card[] = [
    { href: "/reporting/values", title: "Values distribution", desc: "How values ratings are distributed across the organisation.", meta: "Values cycle", icon: iconStar() },
  ];

  return (
    <div>
      <div className="rpt-masthead">
        <div className="intro">
          <h1 style={{ margin: 0 }}>Reporting &amp; Insights</h1>
          <p>Understand organisational performance trends, identify patterns and explore detailed reporting across the selected review period.</p>
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

      <div className="section-label"><span className="bar" /><h2>Executive summary</h2></div>
      <div className="exec-summary">
        <SummaryRow label="What happened" lines={summary.whatHappened} />
        <SummaryRow label="What HR should know" lines={summary.whatToKnow} />
        <SummaryRow label="What HR should do" lines={summary.whatToDo} />
      </div>

      <div className="section-label"><span className="bar" /><h2>Key metrics</h2></div>
      <div className="kpi-strip">
        <Kpi v={perfDist.average != null ? perfDist.average.toFixed(1) : "—"} k="Average rating" sub={basisSub} />
        <Kpi v={median != null ? median.toFixed(1) : "—"} k="Median rating" sub={basisSub} />
        <Kpi v={modeLevel != null ? LEVEL_LABEL[modeLevel] : "—"} k="Most common" sub={basisSub} small />
        <Kpi v={population ? `${Math.round(perfDist.pctAt4or5)}%` : "—"} k="% Rated 4–5" sub={basisSub} />
        <Kpi v={String(population)} k="Completed reviews" sub="This cycle" />
      </div>

      <div className="section-label"><span className="bar" /><h2>Needs attention</h2></div>
      {attention.length === 0 ? (
        <div className="attention"><div style={{ padding: "15px 16px", fontSize: 14 }} className="muted">No items flagged for this timeframe.</div></div>
      ) : (
        <div className="attention">
          {attention.map((a, i) => (
            <Link key={i} href={a.href}>
              <span className="ai">{iconDot()}</span>
              <span className="atext">{a.text}</span>
              <span className="arrow">→</span>
            </Link>
          ))}
        </div>
      )}

      <div className="section-label"><span className="bar" /><h2>Explore reports</h2></div>
      <ReportGroup name="Performance" cards={perfCards} scopeQs={scopeQs} />
      <ReportGroup name="Process" cards={processCards} scopeQs={scopeQs} />
      <ReportGroup name="Values" cards={valuesCards} scopeQs={scopeQs} />
    </div>
  );
}

function SummaryRow({ label, lines }: { label: string; lines: string[] }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div className="row">
      <div className="rlabel">{label}</div>
      <div className="rbody">{lines.join(" ")}</div>
    </div>
  );
}

function Kpi({ v, k, sub, small }: { v: string; k: string; sub: string; small?: boolean }) {
  return (
    <div className={`kpi-card${small ? " small" : ""}`}>
      <div className="v">{v}</div>
      <div className="k">{k}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

function ReportGroup({ name, cards, scopeQs }: { name: string; cards: Card[]; scopeQs: string }) {
  return (
    <div className="rpt-group">
      <div className="gh">{name}</div>
      <div className="rpt-cards">
        {cards.map((c) => (
          <Link key={c.href} href={`${c.href}${scopeQs}`} className="rpt-card">
            <div className="top"><span className="ric">{c.icon}</span><span className="rt">{c.title}</span></div>
            <div className="rd">{c.desc}</div>
            <div className="cmeta">{c.meta}</div>
            <div className="rx">Explore <span className="ar">→</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function svg(children: React.ReactNode) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function iconBars() { return svg(<><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="7" /><rect x="12" y="7" width="3" height="11" /><rect x="17" y="13" width="3" height="5" /></>); }
function iconCompare() { return svg(<><rect x="3" y="10" width="4" height="10" /><rect x="10" y="4" width="4" height="16" /><rect x="17" y="13" width="4" height="7" /></>); }
function iconGap() { return svg(<><path d="M8 3v18" /><path d="M16 3v18" /><path d="M3 8h5" /><path d="M16 16h5" /></>); }
function iconRows() { return svg(<><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h10" /></>); }
function iconPeople() { return svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>); }
function iconCheck() { return svg(<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>); }
function iconStar() { return svg(<path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z" />); }
function iconDot() { return svg(<circle cx="12" cy="12" r="9" />); }
