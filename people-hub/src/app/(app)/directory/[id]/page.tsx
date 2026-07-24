// Employee Profile. Access is permission-checked server-side:
// own profile (any), direct reports (manager), all (HR). A forged URL to
// someone out of scope is redirected — not shown a blank page.

import { getCurrentUser } from "@/core/auth";
import { canViewEmployee } from "@/core/access";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}
const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started", IN_PROGRESS: "In progress", SUBMITTED: "Submitted",
  AWAITING_MANAGER: "Awaiting manager", COMPLETE: "Complete", REOPENED: "Reopened",
};
const STATUS_CLASS: Record<string, string> = {
  NOT_STARTED: "status-outstanding", IN_PROGRESS: "status-inprogress",
  SUBMITTED: "status-submitted", AWAITING_MANAGER: "status-awaiting",
  COMPLETE: "status-completed", REOPENED: "status-reopened",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const { id } = await params;
  const allowed = await canViewEmployee(user, id);
  if (!allowed) redirect("/reviews");

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { manager: true, reports: { orderBy: { displayName: "asc" } } },
  });
  if (!employee) notFound();

  // Read-only lookup of the current quarterly review (display only, no logic).
  const currentReview = await prisma.review.findFirst({
    where: { employeeId: id, type: "QUARTERLY" },
    include: { cycle: true },
    orderBy: { createdAt: "desc" },
  });
  const statusRaw = currentReview?.status ?? "";
  const isActive = employee.employmentStatus === "ACTIVE";

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
        <Link href="/directory">Directory</Link> › {employee.displayName}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
        <span className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>
          {initials(employee.displayName)}
        </span>
        <div>
          <h1 style={{ margin: 0 }}>{employee.displayName}</h1>
          <div className="muted" style={{ fontSize: 14 }}>
            {employee.role ?? "—"}{employee.department ? ` · ${employee.department}` : ""}
          </div>
        </div>
        <span
          className={`chip ${isActive ? "status-active" : "status-inactive"}`}
          style={{ marginLeft: "auto" }}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
          Performance summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 3 }}>Current review</div>
            {currentReview ? (
              <span className={`chip ${STATUS_CLASS[statusRaw] ?? ""}`}>{STATUS_LABEL[statusRaw] ?? statusRaw}</span>
            ) : (
              <span className="muted" style={{ fontSize: 13 }}>none</span>
            )}
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 3 }}>Quarterly score</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {currentReview?.quarterlyScore != null ? currentReview.quarterlyScore.toFixed(1) : <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>pending</span>}
            </div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 3 }}>Values rating</div>
            <span className="coming-soon">Coming soon</span>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 3 }}>Development actions</div>
            <span className="coming-soon">Coming soon</span>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 3 }}>Manager</div>
            <div style={{ fontSize: 14 }}>
              {employee.manager ? (
                <Link href={`/directory/${employee.manager.id}`}>{employee.manager.displayName}</Link>
              ) : "—"}
            </div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 3 }}>Cycle</div>
            <div style={{ fontSize: 14 }}>{currentReview?.cycle.label ?? "—"}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="card">
          <h3>Employment</h3>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "5px 0", borderBottom: "0.5px solid var(--n20)" }}><span className="muted">Role</span><span>{employee.role ?? "—"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "5px 0", borderBottom: "0.5px solid var(--n20)" }}><span className="muted">Department</span><span>{employee.department ?? "—"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "5px 0", borderBottom: "0.5px solid var(--n20)" }}><span className="muted">Location</span><span>{employee.location ?? "—"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "5px 0" }}><span className="muted">Rating guide</span><span>{employee.ratingGuideCategory ?? "not assigned"}</span></div>
        </div>
        <div className="card">
          <h3>Reporting line</h3>
          <div style={{ fontSize: 14, padding: "5px 0" }}>
            <span className="muted">Manager: </span>
            {employee.manager ? (
              <Link href={`/directory/${employee.manager.id}`}>{employee.manager.displayName}</Link>
            ) : "—"}
          </div>
          <div style={{ fontSize: 14, padding: "5px 0" }}>
            <span className="muted">Direct reports: </span>
            {employee.reports.length === 0 ? (
              <span className="muted">none</span>
            ) : (
              employee.reports.map((r: { id: string; displayName: string }, i: number) => (
                <span key={r.id}>{i > 0 && ", "}<Link href={`/directory/${r.id}`}>{r.displayName}</Link></span>
              ))
            )}
          </div>
        </div>
      </div>

      <h2>Performance timeline</h2>
      <div className="empty">
        Quarterly scores, the Values Review, and the year-end summary will
        appear here once those stages are built. Performance and values will be
        shown separately, and scores will honour the manager-only rule.
      </div>
    </div>
  );
}
