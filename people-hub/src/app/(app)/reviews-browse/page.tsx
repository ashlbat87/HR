// Filtered review browser (v0.7) — HR only. Reached from the HR Dashboard: every
// dashboard number links here with filters. Review filters: period, type, cycle, stage.
// Data-quality filters: dq=missing_manager | missing_guide (shows employees). Opening a
// review uses the same /reviews/[id] route, so the reopen-archived-year-end path holds.

import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";
import {
  getFilteredReviews,
  getEmployeesMissingManager,
  getEmployeesMissingGuide,
  type StageKey,
} from "@/modules/performance/dashboard-queries";
import type { ReviewType } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  AWAITING_MANAGER: "Awaiting manager",
  COMPLETE: "Complete",
  REOPENED: "Reopened",
  ARCHIVED: "Archived",
};
const STATUS_CLASS: Record<string, string> = {
  NOT_STARTED: "status-outstanding",
  IN_PROGRESS: "status-inprogress",
  SUBMITTED: "status-submitted",
  AWAITING_MANAGER: "status-awaiting",
  COMPLETE: "status-completed",
  REOPENED: "status-reopened",
  ARCHIVED: "status-completed",
};
const STAGE_LABEL: Record<string, string> = {
  self_review: "Employee self-review",
  awaiting_manager: "Manager review",
  awaiting_ack: "Awaiting acknowledgement",
  done: "Done",
};

function BackAndTitle() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>Reviews</h1>
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 16, marginLeft: 13 }}>
        <Link href="/dashboard">← Back to HR Dashboard</Link>
      </p>
    </>
  );
}

export default async function ReviewsBrowsePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");

  const sp = await searchParams;
  const dq = sp.dq;

  // Data-quality view: show employees, not reviews.
  if (dq === "missing_manager" || dq === "missing_guide") {
    const employees = dq === "missing_manager" ? await getEmployeesMissingManager() : await getEmployeesMissingGuide();
    const label = dq === "missing_manager" ? "Missing manager" : "Missing rating guide";
    return (
      <div>
        <BackAndTitle />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <span className="chip status-overdue">{label}</span>
          <Link href="/reviews-browse" className="muted" style={{ fontSize: 13, alignSelf: "center" }}>Clear filters</Link>
        </div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{employees.length} employee{employees.length === 1 ? "" : "s"}</div>
        {employees.length === 0 ? (
          <div className="empty">No employees match. This issue is clear.</div>
        ) : (
          <div className="card">
            {employees.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "0.5px solid var(--n20)" }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{e.displayName}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{e.workEmail}</div>
                </div>
                <Link href={`/directory/${e.id}`}>Open profile</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const periodId = sp.period;
  const type = sp.type as ReviewType | undefined;
  const stage = sp.stage as StageKey | undefined;
  const cycleId = sp.cycle;

  const reviews = await getFilteredReviews({ periodId, type, stage });
  let rows = reviews;
  let cycleLabel: string | null = null;
  if (cycleId) {
    const withCycle = await prisma.review.findMany({ where: { cycleId }, select: { id: true } });
    const ids = new Set(withCycle.map((r) => r.id));
    rows = reviews.filter((r) => ids.has(r.id));
    const cyc = await prisma.reviewCycle.findUnique({ where: { id: cycleId }, select: { label: true } });
    cycleLabel = cyc?.label ?? null;
  }

  const period = periodId ? await prisma.reviewPeriod.findUnique({ where: { id: periodId }, select: { label: true } }) : null;

  const activeFilters: string[] = [];
  if (period) activeFilters.push("Period: " + period.label);
  if (cycleLabel) activeFilters.push("Cycle: " + cycleLabel);
  if (type && !cycleLabel) activeFilters.push("Type: " + type);
  if (stage) activeFilters.push("Stage: " + (STAGE_LABEL[stage] ?? stage));

  return (
    <div>
      <BackAndTitle />
      {activeFilters.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {activeFilters.map((f) => <span key={f} className="chip">{f}</span>)}
          <Link href="/reviews-browse" className="muted" style={{ fontSize: 13, alignSelf: "center" }}>Clear filters</Link>
        </div>
      ) : null}

      <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{rows.length} review{rows.length === 1 ? "" : "s"}</div>

      {rows.length === 0 ? (
        <div className="empty">No reviews match these filters.</div>
      ) : (
        <div className="card">
          {rows.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "0.5px solid var(--n20)" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{r.typeLabel} · {r.employeeName}</div>
                <div className="muted" style={{ fontSize: 13 }}>{r.managerName ? "Manager: " + r.managerName : "No manager"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className={`chip ${STATUS_CLASS[r.status] ?? ""}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                <Link href={`/reviews/${r.id}`}>Open</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
