// Reporting drill-down (v0.8, Stage 7b/7c). Lists the underlying reviews for either a rating
// bucket (level) or a group (department / function / manager). Counts match the source
// exactly (same grouping/rounding). HR-only.
import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";
import {
  getReviewData, reviewsInBucket, reviewsInGroup,
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
  const periodId = sp.period;
  const scope = periodId ? { periodId } : {};
  const period = periodId ? await prisma.reviewPeriod.findUnique({ where: { id: periodId }, select: { label: true } }) : null;
  const data = await getReviewData(dimension, scope);

  const groupBy = (sp.group === "department" || sp.group === "func" || sp.group === "manager") ? (sp.group as GroupBy) : null;
  const groupValue = sp.value;

  let rows;
  let heading: string;
  let breadcrumbTail: React.ReactNode;
  let filterChips: React.ReactNode;

  if (groupBy && groupValue) {
    rows = reviewsInGroup(data, groupBy, groupValue);
    // For managers, the key is an id; show a friendly label from the first matching row.
    const back = GROUP_BACK[groupBy];
    const displayValue = groupBy === "manager" ? (rows[0]?.managerName ?? "Manager") : groupValue;
    heading = `${displayValue} — ${dimLabel.toLowerCase()} reviews`;
    breadcrumbTail = (<><Link href={back.href}>{back.label}</Link> › {displayValue}</>);
    filterChips = (<>
      <span className="chip">Period: {period ? period.label : "current"}</span>
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
      <span className="chip">Period: {period ? period.label : "current"}</span>
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
