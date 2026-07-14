// My Team — manager view of DIRECT reports only (Phase 1: no skip-level).
// Guarded server-side: a non-manager reaching this route is redirected.

import { getCurrentUser } from "@/core/auth";
import { isManager } from "@/core/access";
import { redirect } from "next/navigation";
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

export default async function MyTeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isManager(user)) redirect("/reviews");

  const reports = await prisma.employee.findMany({
    where: { managerId: user.employeeId },
    orderBy: { displayName: "asc" },
  });

  // Read-only: current quarterly review per report (display only, no logic).
  const reviews = await prisma.review.findMany({
    where: { managerId: user.employeeId, type: "QUARTERLY" },
  });
  const statusByEmployee: Record<string, string> = {};
  for (const rv of reviews) statusByEmployee[rv.employeeId] = rv.status;

  return (
    <div>
      <h1>My Team</h1>
      <p className="muted">Your direct reports and their current review status.</p>

      {reports.length === 0 ? (
        <div className="empty">
          You don&apos;t have any direct reports assigned. If that&apos;s wrong, contact HR.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {reports.map((r) => {
            const st = statusByEmployee[r.id];
            return (
              <div className="card" key={r.id} style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <span className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>{initials(r.displayName)}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{r.displayName}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {r.role ?? "—"}{r.department ? ` · ${r.department}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "0.5px solid var(--n20)" }}>
                  {st ? (
                    <span className={`chip ${STATUS_CLASS[st] ?? ""}`}>{STATUS_LABEL[st] ?? st}</span>
                  ) : (
                    <span className="muted" style={{ fontSize: 13 }}>No review yet</span>
                  )}
                  <Link href={`/directory/${r.id}`}>View profile</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
