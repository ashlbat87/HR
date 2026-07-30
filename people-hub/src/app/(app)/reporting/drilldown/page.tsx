// Reporting drill-down (v0.8, Stage 7b/7c). Lists the underlying reviews for either a rating
// bucket (level) or a group (department / function / manager). Counts match the source
// exactly (same grouping/rounding). HR-only.
import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import { resolveScope, scopeToQuery } from "@/modules/performance/reporting-scope";
import Link from "next/link";
import {
  getReviewData, reviewsInBucket, reviewsInGroup, reviewsInCriterionBucket, reviewsInGapBucket,
  type RatingDimension, type GroupBy,
} from "@/modules/performance/reporting-queries";

const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };
const GROUP_BACK: Record<GroupBy, { href: string; label: string; noun: string }> = {
  department: { href: "/reporting/departments", label: "Department comparison", noun: "Department" },
  func: { href: "/reporting/functions", label: "Function comparison", noun: "Function" },
  manager: { href: "/reporting/managers", label: "Manager comparison", noun: "Manager" },
};

export default async function ReportingDrilldownPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");

  const sp = await searchParams;
  const dimension = (sp.dimension === "VALUES" ? "VALUES" : "PERFORMANCE") as RatingDimension;
  const dimLabel = dimension === "PERFORMANCE" ? "Performance" : "Values";
  const scope = await resolveScope(dimension, { cycle: sp.cycle, scope: sp.scope, period: sp.period });
  const data = scope ? await getReviewData(dimension, scopeToQuery(scope)) : [];
  const scopeLabel = !scope ? "current" : scope.kind === "cycle" ? scope.cycleLabel : `Full year ${scope.periodLabel}`;

  const groupBy = (sp.group === "department" || sp.group === "func" || sp.group === "manager") ? (sp.group as GroupBy) : null;
  const groupValue = sp.value;

  let rows;
  let heading: string;
  let breadcrumbTail: React.ReactNode;
  let filterChips: React.ReactNode;

  const criterion = (sp.criterion === "IMPACT" || sp.criterion === "QUALITY" || sp.criterion === "DELIVERY") ? sp.criterion : null;

  if (criterion) {
    const level = Math.max(1, Math.min(5, parseInt(sp.level ?? "0", 10) || 0));
    rows = scope ? await reviewsInCriterionBucket(scopeToQuery(scope), criterion, level) : [];
    const CRIT_LABEL: Record<string, string> = { IMPACT: "Impact", QUALITY: "Quality", DELIVERY: "Delivery" };
    heading = `${LEVEL_LABEL[level]} — ${CRIT_LABEL[criterion]} ratings`;
    breadcrumbTail = (<><Link href="/reporting/criterion">Performance criterion analysis</Link> › {CRIT_LABEL[criterion]} › {LEVEL_LABEL[level]}</>);
    filterChips = (<>
      <span className="chip">Timeframe: {scopeLabel}</span>
      <span className="chip">Type: {dimLabel}</span>
      <span className="chip">Criterion: {CRIT_LABEL[criterion]}</span>
      <span className="chip">Rating: {LEVEL_LABEL[level]}</span>
    </>);
  } else if (sp.gap === "zero" || sp.gap === "one" || sp.gap === "twoPlus") {
    const gapBucket = sp.gap as "zero" | "one" | "twoPlus";
    rows = reviewsInGapBucket(data, gapBucket);
    const GAP_LABEL: Record<string, string> = { zero: "Agreed (same rating)", one: "Differed by one level", twoPlus: "Differed by two or more" };
    heading = `Self vs manager — ${GAP_LABEL[gapBucket].toLowerCase()}`;
    breadcrumbTail = (<><Link href="/reporting/gaps">Self vs manager gaps</Link> › {GAP_LABEL[gapBucket]}</>);
    filterChips = (<>
      <span className="chip">Timeframe: {scopeLabel}</span>
      <span className="chip">Type: {dimLabel}</span>
      <span className="chip">Gap: {GAP_LABEL[gapBucket]}</span>
    </>);
  } else if (groupBy && groupValue) {
    rows = reviewsInGroup(data, groupBy, groupValue);
    // For managers, the key is an id; show a friendly label from the first matching row.
    const back = GROUP_BACK[groupBy];
    const displayValue = groupBy === "manager" ? (rows[0]?.managerName ?? "Manager") : groupValue;
    heading = `${displayValue} — ${dimLabel.toLowerCase()} reviews`;
    breadcrumbTail = (<><Link href={back.href}>{back.label}</Link> › {displayValue}</>);
    filterChips = (<>
      <span className="chip">Timeframe: {scopeLabel}</span>
      <span className="chip">Type: {dimLabel}</span>
      <span className="chip">{back.noun}: {displayValue}</span>
    </>);
  } else {
    const level = Math.max(1, Math.min(5, parseInt(sp.level ?? "0", 10) || 0));
    rows = reviewsInBucket(data, level);
    const back = dimension === "PERFORMANCE" ? "/reporting/performance" : "/reporting/values";
    heading = `${LEVEL_LABEL[level]} ${dimLabel.toLowerCase()} ratings`;
    breadcrumbTail = (<><Link href={back}>{dimLabel} distribution</Link> › {LEVEL_LABEL[level]}</>);
    filterChips = (<>
      <span className="chip">Timeframe: {scopeLabel}</span>
      <span className="chip">Type: {dimLabel}</span>
      <span className="chip">Rating: {LEVEL_LABEL[level]}</span>
    </>);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>{heading}</h1>
      </div>
      <div className="muted" style={{ fontSize: 12, marginLeft: 13, marginBottom: 14 }}>
        <Link href="/reporting">Reporting &amp; Insights</Link> › {breadcrumbTail}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>{filterChips}</div>

      <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{rows.length} review{rows.length === 1 ? "" : "s"}</div>

      {rows.length === 0 ? (
        <div className="empty">No reviews match this selection.</div>
      ) : (
        <div className="card">
          {rows.map((r) => (
            <div key={r.reviewId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "0.5px solid var(--n20)" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{r.employeeName}</div>
                <div className="muted" style={{ fontSize: 13 }}>Manager: {r.managerName}{r.department ? ` · ${r.department}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="chip status-submitted">Score {r.officialScore.toFixed(1)}</span>
                <Link href={`/reviews/${r.reviewId}`}>Open</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
