// HR Dashboard — Performance Operations Cockpit (v0.7). HR/HR Admin only, guarded
// server-side. Active period, current period health (per cycle, stage-aware),
// process exceptions (Needs Attention), and data-quality (Setup Issues). Every review
// number links into /reviews-browse with the matching filters.

import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  getPeriodStatusSummary,
  getEmployeesMissingManager,
  getEmployeesMissingGuide,
} from "@/modules/performance/dashboard-queries";

function Heading({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: 28 }}>
      <div style={{ width: 3, height: 20, background: "var(--purple)", borderRadius: 2 }} />
      <h2 style={{ margin: 0, fontSize: 17 }}>{children}</h2>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");

  const currentPeriod = await prisma.reviewPeriod.findFirst({
    where: { isCurrent: true },
    include: { cycles: { orderBy: { createdAt: "asc" } } },
  });

  const [summary, missingManager, missingGuide] = await Promise.all([
    currentPeriod ? getPeriodStatusSummary(currentPeriod.id) : Promise.resolve([]),
    getEmployeesMissingManager(),
    getEmployeesMissingGuide(),
  ]);

  const pid = currentPeriod?.id ?? "";
  const browse = (cycleId: string, stage: string) =>
    `/reviews-browse?period=${encodeURIComponent(pid)}&cycle=${encodeURIComponent(cycleId)}&stage=${encodeURIComponent(stage)}`;

  const attention = summary
    .map((c) => ({
      cycleId: c.cycleId,
      label: c.label,
      typeLabel: c.typeLabel,
      notStarted: c.stages.find((s) => s.key === "self_review")?.count ?? 0,
      awaitingManager: c.stages.find((s) => s.key === "awaiting_manager")?.count ?? 0,
      awaitingAck: c.stages.find((s) => s.key === "awaiting_ack")?.count ?? 0,
    }))
    .filter((a) => a.notStarted + a.awaitingManager + a.awaitingAck > 0);

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>HR Dashboard</h1>
      <p className="muted" style={{ marginTop: 0 }}>Performance operations at a glance.</p>

      {currentPeriod ? (
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--purple-subtle)", border: "none" }}>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Active review period</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{currentPeriod.label} · {currentPeriod.status.toLowerCase()}</div>
          </div>
          <Link href="/periods" className="btn secondary">Manage periods →</Link>
        </div>
      ) : (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No active review period</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Create or set a current period to start running reviews.</div>
          <Link href="/periods" className="btn secondary">Manage periods →</Link>
        </div>
      )}

      <Heading>Current period health</Heading>
      {summary.length === 0 ? (
        <div className="empty">No reviews are open in {currentPeriod ? currentPeriod.label : "the current period"} yet.</div>
      ) : (
        summary.map((c) => (
          <div key={c.cycleId} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{c.label} <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>· {c.typeLabel}</span></div>
              <div className="muted" style={{ fontSize: 13 }}>{c.completed} of {c.total} done · {c.completionPct}%</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {c.stages.map((s) => (
                <Link key={s.key} href={browse(c.cycleId, s.key)} style={{ flex: "1 1 120px", textDecoration: "none", color: "inherit" }}>
                  <div style={{ background: s.key === "done" ? "var(--purple-subtle)" : "#F5F6F8", borderRadius: 8, padding: "8px 10px" }}>
                    <div className="muted" style={{ fontSize: 12 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{s.count}</div>
                  </div>
                </Link>
              ))}
            </div>
            {c.bottleneck ? (
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{c.bottleneck}</div>
            ) : (
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>All reviews complete.</div>
            )}
          </div>
        ))
      )}

      <Heading>Needs attention</Heading>
      {attention.length === 0 ? (
        <div className="empty">No outstanding review actions. Everything is progressing.</div>
      ) : (
        attention.map((a) => (
          <div key={a.cycleId} className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{a.label} <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>· {a.typeLabel}</span></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {a.notStarted > 0 ? <Link href={browse(a.cycleId, "self_review")} className="chip" style={{ textDecoration: "none" }}>{a.notStarted} not started</Link> : null}
              {a.awaitingManager > 0 ? <Link href={browse(a.cycleId, "awaiting_manager")} className="chip" style={{ textDecoration: "none" }}>{a.awaitingManager} awaiting manager</Link> : null}
              {a.awaitingAck > 0 ? <Link href={browse(a.cycleId, "awaiting_ack")} className="chip" style={{ textDecoration: "none" }}>{a.awaitingAck} awaiting acknowledgement</Link> : null}
            </div>
          </div>
        ))
      )}

      <Heading>Setup issues</Heading>
      {missingManager.length === 0 && missingGuide.length === 0 ? (
        <div className="empty">No configuration issues. All active employees have a manager and a rating guide.</div>
      ) : (
        <div className="card">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {missingManager.length > 0 ? <Link href="/reviews-browse?dq=missing_manager" className="chip status-overdue" style={{ textDecoration: "none" }}>{missingManager.length} missing manager</Link> : null}
            {missingGuide.length > 0 ? <Link href="/reviews-browse?dq=missing_guide" className="chip status-overdue" style={{ textDecoration: "none" }}>{missingGuide.length} missing rating guide</Link> : null}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>These block reviews from running for the affected employees.</div>
        </div>
      )}
    </div>
  );
}
