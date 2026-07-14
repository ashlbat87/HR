// HR Dashboard. Stage 1 is the foundation, so this shows headline employee
// counts (real data) and states that cycle-completion metrics arrive with the
// review workflow. HR / HR Admin only, guarded server-side.

import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");

  const [total, active, unassignedGuide, managers] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { ratingGuideCategory: null } }),
    prisma.employee.findMany({
      where: { reports: { some: {} } },
      select: { id: true },
    }),
  ]);

  return (
    <div>
      <h1>HR Dashboard</h1>
      <p className="muted">
        Cycle progress and completion metrics appear here once the review
        workflow is built. For now, the foundation figures:
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="card" style={{ minWidth: 150 }}>
          <div className="muted">Employees</div>
          <div style={{ fontSize: 28 }}>{total}</div>
        </div>
        <div className="card" style={{ minWidth: 150 }}>
          <div className="muted">Active</div>
          <div style={{ fontSize: 28 }}>{active}</div>
        </div>
        <div className="card" style={{ minWidth: 150 }}>
          <div className="muted">Managers</div>
          <div style={{ fontSize: 28 }}>{managers.length}</div>
        </div>
        <div className="card" style={{ minWidth: 150 }}>
          <div className="muted">Rating guide unassigned</div>
          <div style={{ fontSize: 28 }}>{unassignedGuide}</div>
        </div>
      </div>
      <p>
        <Link href="/directory">Go to the Employee Directory →</Link>
      </p>
    </div>
  );
}
