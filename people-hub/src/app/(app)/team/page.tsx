// My Team — manager view of DIRECT reports only (Phase 1: no skip-level).
// Guarded server-side: a non-manager reaching this route is redirected.

import { getCurrentUser } from "@/core/auth";
import { isManager } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";

export default async function MyTeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isManager(user)) redirect("/reviews");

  const reports = await prisma.employee.findMany({
    where: { managerId: user.employeeId },
    orderBy: { displayName: "asc" },
  });

  return (
    <div>
      <h1>My Team</h1>
      <p className="muted">
        Your direct reports. Review status per instrument appears here once the
        review workflow is built.
      </p>
      {reports.length === 0 ? (
        <div className="empty">
          You don&apos;t have any direct reports assigned. If that&apos;s wrong,
          contact HR.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Rating guide</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.displayName}</td>
                <td>{r.role ?? "—"}</td>
                <td>{r.department ?? "—"}</td>
                <td>{r.ratingGuideCategory ?? <span className="muted">not assigned</span>}</td>
                <td>
                  <Link href={`/directory/${r.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
