// Employee Profile. Access is permission-checked server-side:
// own profile (any), direct reports (manager), all (HR). A user who forges a
// URL to someone they cannot see is redirected — not shown a blank page.

import { getCurrentUser } from "@/core/auth";
import { canViewEmployee } from "@/core/access";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const { id } = await params;
  const allowed = await canViewEmployee(user, id);
  if (!allowed) redirect("/reviews"); // no peeking at people out of scope

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      manager: true,
      reports: { orderBy: { displayName: "asc" } },
    },
  });
  if (!employee) notFound();

  return (
    <div>
      <h1>{employee.displayName}</h1>
      <div className="card">
        <div>
          <strong>Role:</strong> {employee.role ?? "—"}
        </div>
        <div>
          <strong>Department:</strong> {employee.department ?? "—"}
        </div>
        <div>
          <strong>Location:</strong> {employee.location ?? "—"}
        </div>
        <div>
          <strong>Rating guide:</strong>{" "}
          {employee.ratingGuideCategory ?? (
            <span className="muted">not assigned</span>
          )}
        </div>
        <div>
          <strong>Status:</strong>{" "}
          <span className="chip">{employee.employmentStatus}</span>
        </div>
      </div>

      <h2>Reporting line</h2>
      <div className="card">
        <div>
          Manager:{" "}
          {employee.manager ? (
            <Link href={`/directory/${employee.manager.id}`}>
              {employee.manager.displayName}
            </Link>
          ) : (
            "—"
          )}
        </div>
        <div style={{ marginTop: 6 }}>
          Direct reports:{" "}
          {employee.reports.length === 0 ? (
            <span className="muted">none</span>
          ) : (
            employee.reports.map((r: { id: string; displayName: string }, i: number) => (
              <span key={r.id}>
                {i > 0 && ", "}
                <Link href={`/directory/${r.id}`}>{r.displayName}</Link>
              </span>
            ))
          )}
        </div>
      </div>

      <h2>Performance timeline</h2>
      <div className="empty">
        Quarterly scores, the annual values review, and the year-end summary will
        appear here once the review workflow is built. Scores will honour the
        manager-only rule, and performance and values will be shown separately.
      </div>
    </div>
  );
}
