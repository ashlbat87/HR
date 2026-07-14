import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";
import { canViewReview, managerOpen, getVisibleTimeline } from "@/modules/performance/review-workflow";
import { ReviewForm } from "../ReviewForm";
import { ReviewTimeline } from "@/modules/performance/ReviewTimeline";

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  AWAITING_MANAGER: "Awaiting manager",
  COMPLETE: "Complete",
  REOPENED: "Reopened",
};

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      employee: true,
      manager: true,
      cycle: true,
      ratings: true,
    },
  });
  if (!review) notFound();

  if (!canViewReview(user, review)) redirect("/reviews");

  const isManager = user.employeeId === review.managerId;

  if (isManager && review.status === "SUBMITTED") {
    await managerOpen(review.id, user);
  }

  const fresh = await prisma.review.findUnique({ where: { id }, include: { ratings: true } });
  const status = fresh?.status ?? review.status;

  const employeeRatings = (fresh?.ratings ?? review.ratings).filter((r) => r.side === "EMPLOYEE");
  const managerRatings = (fresh?.ratings ?? review.ratings).filter((r) => r.side === "MANAGER");

  const timeline = await getVisibleTimeline(review.id, user, review);

  const mode: "employee" | "manager" = isManager ? "manager" : "employee";

  return (
    <div>
      <p className="muted">
        <Link href="/reviews">← My reviews</Link>
      </p>
      <h1>Quarterly review · {review.cycle.label}</h1>
      <div className="card">
        <div><strong>Employee:</strong> {review.employee.displayName}</div>
        <div><strong>Manager:</strong> {review.manager.displayName}</div>
        <div><strong>Status:</strong> <span className="chip">{STATUS_LABEL[status] ?? status}</span></div>
      </div>

      <h2>Scores and narrative</h2>
      <ReviewForm
        reviewId={review.id}
        mode={mode}
        status={status}
        employeeRatings={employeeRatings.map((r) => ({ item: r.item, score: r.score, comment: r.comment }))}
        managerRatings={managerRatings.map((r) => ({ item: r.item, score: r.score, comment: r.comment }))}
        okrContribution={review.okrContribution ?? ""}
        developmentAction={review.developmentAction ?? ""}
        employeeReflection={review.employeeReflection ?? ""}
        quarterlyScore={fresh?.quarterlyScore ?? review.quarterlyScore}
        canReopen={isManager || isHR(user)}
      />

      <h2>Activity history</h2>
      <p className="muted">A record of what has happened to this review. This is not the system audit log.</p>
      <ReviewTimeline events={timeline} />
    </div>
  );
}
