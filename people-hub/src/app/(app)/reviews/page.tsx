// Reviews — a person's own reviews only. Team reviews live under /team;
// HR administration lives under /reviews-admin.
import { getCurrentUser } from "@/core/auth";
import { requireSignedIn, isHR, isManager } from "@/core/access";
import { prisma } from "@/shared/lib/prisma";
import { ReviewRow } from "./ReviewRow";

export default async function ReviewsPage() {
  const user = requireSignedIn(await getCurrentUser());
  const hr = isHR(user);
  const manager = isManager(user);
  const myReviews = await prisma.review.findMany({
    where: { employeeId: user.employeeId },
    include: { cycle: true, employee: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 3, height: 22, background: "var(--purple)", borderRadius: 2 }} />
        <h1 style={{ margin: 0 }}>Reviews</h1>
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 28, marginLeft: 13 }}>
        {hr ? "Your own reviews. Team and organisation-wide administration are in their own areas." : manager ? "Your own reviews. Your team's reviews are under My Team." : "Your performance and values reviews."}
      </p>

      <h2>Your reviews</h2>
      {myReviews.length === 0 ? (
        <div className="empty">You have no reviews yet.</div>
      ) : (
        <div className="card">{myReviews.map((r) => <ReviewRow key={r.id} r={r} />)}</div>
      )}
    </div>
  );
}