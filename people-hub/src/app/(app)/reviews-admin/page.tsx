// Review administration — HR only. Generate reviews for open cycles and browse
// every review across the organisation (including reopening archived year-ends).
import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import { CreateCycleReviews } from "../reviews/CreateCycleReviews";
import { ReviewRow } from "../reviews/ReviewRow";

export default async function ReviewsAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHR(user)) redirect("/reviews");

  const openCycles = await prisma.reviewCycle.findMany({ where: { isOpen: true }, orderBy: { createdAt: "desc" } });
  const allReviews = await prisma.review.findMany({
    include: { cycle: true, employee: true },
    orderBy: [{ cycle: { createdAt: "desc" } }, { employee: { displayName: "asc" } }],
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>Review administration</h1>
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 28, marginLeft: 13 }}>
        Generate reviews for open cycles, and browse every review across the organisation.
      </p>

      {openCycles.length > 0 ? (
        <>
          <h3 style={{ fontSize: 15 }}>Generate reviews</h3>
          {openCycles.map((c) => (
            <CreateCycleReviews key={c.id} cycleId={c.id} label={c.label} type={c.type} />
          ))}
        </>
      ) : null}

      <h3 style={{ fontSize: 15, marginTop: 28 }}>All reviews</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
        Open any review to view it, or to reopen an archived year-end summary.
      </p>
      {allReviews.length === 0 ? (
        <div className="empty">No reviews yet.</div>
      ) : (
        <div className="card">{allReviews.map((r) => <ReviewRow key={r.id} r={r} />)}</div>
      )}
    </div>
  );
}