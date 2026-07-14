import { getCurrentUser } from "@/core/auth";
import { requireSignedIn, isHR } from "@/core/access";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";
import { CreateCycleReviews } from "./CreateCycleReviews";

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  AWAITING_MANAGER: "Awaiting manager",
  COMPLETE: "Complete",
  REOPENED: "Reopened",
};

function reviewRow(r: { id: string; status: string; employeeName: string; cycleLabel: string }) {
  return (
    <tr key={r.id}>
      <td>{r.employeeName}</td>
      <td>{r.cycleLabel}</td>
      <td><span className="chip">{STATUS_LABEL[r.status] ?? r.status}</span></td>
      <td><Link href={"/reviews/" + r.id}>Open</Link></td>
    </tr>
  );
}

export default async function MyReviewsPage() {
  const user = requireSignedIn(await getCurrentUser());

  const myReviews = await prisma.review.findMany({
    where: { employeeId: user.employeeId, type: "QUARTERLY" },
    include: { employee: true, cycle: true },
    orderBy: { createdAt: "desc" },
  });

  const teamReviews = await prisma.review.findMany({
    where: { managerId: user.employeeId, type: "QUARTERLY" },
    include: { employee: true, cycle: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const openCycle = await prisma.reviewCycle.findFirst({
    where: { type: "QUARTERLY", isOpen: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1>My Reviews</h1>

      {isHR(user) && openCycle ? (
        <CreateCycleReviews cycleId={openCycle.id} label={openCycle.label} />
      ) : null}

      <h2>My quarterly review</h2>
      {myReviews.length === 0 ? (
        <div className="empty">You have no quarterly review yet.</div>
      ) : (
        <table>
          <thead>
            <tr><th>Employee</th><th>Cycle</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {myReviews.map((r) =>
              reviewRow({ id: r.id, status: r.status, employeeName: r.employee.displayName, cycleLabel: r.cycle.label })
            )}
          </tbody>
        </table>
      )}

      {teamReviews.length > 0 ? (
        <>
          <h2>My team's reviews</h2>
          <table>
            <thead>
              <tr><th>Employee</th><th>Cycle</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {teamReviews.map((r) =>
                reviewRow({ id: r.id, status: r.status, employeeName: r.employee.displayName, cycleLabel: r.cycle.label })
              )}
            </tbody>
          </table>
        </>
      ) : null}
    </div>
  );
}
