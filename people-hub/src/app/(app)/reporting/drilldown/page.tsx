// Reporting drill-down (v0.8, Stage 7b, rev 4). Lists the reviews in a clicked rating
// bucket. Count matches the distribution bar exactly (same rounding, PD-016). HR-only.

import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";
import { getReviewData, reviewsInBucket, type RatingDimension } from "@/modules/performance/reporting-queries";

const LEVEL_LABEL: Record<number, string> = { 1: "Poor", 2: "Base", 3: "Intermediate", 4: "Advanced", 5: "Rock Star" };

export default async function ReportingDrilldownPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");

  const sp = await searchParams;
  const dimension = (sp.dimension === "VALUES" ? "VALUES" : "PERFORMANCE") as RatingDimension;
  const dimLabel = dimension === "PERFORMANCE" ? "Performance" : "Values";
  const level = Math.max(1, Math.min(5, parseInt(sp.level ?? "0", 10) || 0));
  const periodId = sp.period;
  const scope = periodId ? { periodId } : {};

  const data = await getReviewData(dimension, scope);
  const rows = reviewsInBucket(data, level);
  const backHref = dimension === "PERFORMANCE" ? "/reporting/performance" : "/reporting/values";
  const period = periodId ? await prisma.reviewPeriod.findUnique({ where: { id: periodId }, select: { label: true } }) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>{LEVEL_LABEL[level]} {dimLabel.toLowerCase()} ratings</h1>
      </div>
      <div className="muted" style={{ fontSize: 12, marginLeft: 13, marginBottom: 14 }}>
        <Link href="/reporting">Reporting &amp; Insights</Link> › <Link href={backHref}>{dimLabel} distribution</Link> › {LEVEL_LABEL[level]}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <span className="chip">Period: {period ? period.label : "current"}</span>
        <span className="chip">Type: {dimLabel}</span>
        <span className="chip">Rating: {LEVEL_LABEL[level]}</span>
      </div>

      <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{rows.length} review{rows.length === 1 ? "" : "s"}</div>

      {rows.length === 0 ? (
        <div className="empty">No reviews in this bucket.</div>
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
