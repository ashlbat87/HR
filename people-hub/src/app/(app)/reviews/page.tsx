// My Reviews — lists the person's own reviews and, for managers, their team's.
// HR gets controls to generate reviews for open cycles (quarterly and values).
// Reviews of both types (QUARTERLY, ANNUAL_VALUES) are shown, labelled by type.

import { getCurrentUser } from "@/core/auth";
import { requireSignedIn, isHR, isManager } from "@/core/access";
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
const STATUS_CLASS: Record<string, string> = {
  NOT_STARTED: "status-outstanding",
  IN_PROGRESS: "status-inprogress",
  SUBMITTED: "status-submitted",
  AWAITING_MANAGER: "status-awaiting",
  COMPLETE: "status-completed",
  REOPENED: "status-reopened",
};
const TYPE_LABEL: Record<string, string> = {
  QUARTERLY: "Quarterly review",
  ANNUAL_VALUES: "Annual values review",
  YEAR_END: "Year-end summary",
};

function ReviewRow({ r }: { r: any }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "0.5px solid var(--n20)" }}>
      <div>
        <div style={{ fontWeight: 500 }}>{TYPE_LABEL[r.type] ?? r.type} · {r.cycle.label}</div>
        <div className="muted" style={{ fontSize: 13 }}>{r.employee.displayName}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className={`chip ${STATUS_CLASS[r.status] ?? ""}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
        <Link href={`/reviews/${r.id}`}>Open</Link>
      </div>
    </div>
  );
}

export default async function MyReviewsPage() {
  const user = requireSignedIn(await getCurrentUser());

  const myReviews = await prisma.review.findMany({
    where: { employeeId: user.employeeId },
    include: { cycle: true, employee: true },
    orderBy: { createdAt: "desc" },
  });

  const teamReviews = isManager(user)
    ? await prisma.review.findMany({
        where: { managerId: user.employeeId },
        include: { cycle: true, employee: true },
        orderBy: [{ cycle: { createdAt: "desc" } }, { employee: { displayName: "asc" } }],
      })
    : [];

  const openCycles = isHR(user)
    ? await prisma.reviewCycle.findMany({ where: { isOpen: true }, orderBy: { createdAt: "desc" } })
    : [];

  return (
    <div>
      <h1>My Reviews</h1>

      {isHR(user) && openCycles.length > 0 ? (
        <>
          <h2>HR: generate reviews</h2>
          {openCycles.map((c) => (
            <CreateCycleReviews key={c.id} cycleId={c.id} label={c.label} type={c.type} />
          ))}
        </>
      ) : null}

      <h2>Your reviews</h2>
      {myReviews.length === 0 ? (
        <div className="empty">You have no reviews yet.</div>
      ) : (
        <div className="card">{myReviews.map((r) => <ReviewRow key={r.id} r={r} />)}</div>
      )}

      {isManager(user) ? (
        <>
          <h2>Your team&apos;s reviews</h2>
          {teamReviews.length === 0 ? (
            <div className="empty">No reviews for your team yet.</div>
          ) : (
            <div className="card">{teamReviews.map((r) => <ReviewRow key={r.id} r={r} />)}</div>
          )}
        </>
      ) : null}
    </div>
  );
}
