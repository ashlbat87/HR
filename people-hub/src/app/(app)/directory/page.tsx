// Employee Directory — HR / HR Admin only. Search + department + status filters.
// Filter state is in the URL (not browser storage), per the blueprint.

import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
function statusClass(s: string) {
  return s === "ACTIVE" ? "status-active" : "status-inactive";
}
function statusLabel(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const dept = sp.dept ?? "";
  const status = sp.status ?? "";

  const employees = await prisma.employee.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { displayName: { contains: q, mode: "insensitive" } },
                { workEmail: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        dept ? { department: dept } : {},
        status ? { employmentStatus: status as any } : {},
      ],
    },
    include: { manager: true },
    orderBy: { displayName: "asc" },
  });

  const departments = await prisma.employee.findMany({
    where: { department: { not: null } },
    select: { department: true },
    distinct: ["department"],
    orderBy: { department: "asc" },
  });

  return (
    <div>
      <h1>Employee Directory</h1>
      <form className="filters" method="get">
        <input type="search" name="q" placeholder="Name or email" defaultValue={q} />
        <select name="dept" defaultValue={dept}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.department} value={d.department!}>
              {d.department}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button type="submit">Apply</button>
        <Link className="btn secondary" href="/directory">Clear</Link>
      </form>

      {employees.length === 0 ? (
        <div className="empty">
          {q || dept || status
            ? "No employees match these filters."
            : "No employees yet. Import from Zoho to get started."}
        </div>
      ) : (
        <>
          <p className="muted">{employees.length} result{employees.length === 1 ? "" : "s"}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Manager</th>
                <th>Rating guide</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span className="avatar">{initials(e.displayName)}</span>
                      {e.displayName}
                    </span>
                  </td>
                  <td className="muted">{e.department ?? "—"}</td>
                  <td className="muted">{e.manager?.displayName ?? "—"}</td>
                  <td className="muted">
                    {e.ratingGuideCategory ?? <span className="muted">not assigned</span>}
                  </td>
                  <td>
                    <span className={`chip ${statusClass(e.employmentStatus)}`}>
                      {statusLabel(e.employmentStatus)}
                    </span>
                  </td>
                  <td>
                    <Link href={`/directory/${e.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
