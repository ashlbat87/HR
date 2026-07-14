import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";
import { canViewReview, managerOpen, getVisibleTimeline } from "@/modules/performance/review-workflow";
import { ReviewForm } from "../ReviewForm";
import { ValuesReviewForm } from "../ValuesReviewForm";
import { ReviewTimeline } from "@/modules/performance/ReviewTimeline";

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
    include: { employee: true, manager: true, cycle: true, ratings: true },
  });
  if (!review) notFound();
  if (!canViewReview(user, review)) redirect("/reviews");

  const isEmployee = user.employeeId === review.employeeId;
  const isManager = user.employeeId === review.managerId;

  if (isManager && review.status === "SUBMITTED") {
    await managerOpen(review.id, user);
  }

  const fresh = await prisma.review.findUnique({ where: { id }, include: { ratings: true } });
  const status = fresh?.status ?? review.status;
  const allRatings = fresh?.ratings ?? review.ratings;
  const employeeRatings = allRatings.filter((r) => r.side === "EMPLOYEE");
  const managerRatings = allRatings.filter((r) => r.side === "MANAGER");

  const timeline = await getVisibleTimeline(review.id, user, review);
  const mode: "employee" | "manager" = isManager ? "manager" : "employee";
  const isValues = review.type === "ANNUAL_VALUES";
  const title = isValues ? "Annual values review" : "Quarterly review";

  // For values reviews, load the current VALUES guide anchors to show inline.
  let anchors: Record<string, Record<number, string>> = {};
  if (isValues) {
    const guide = await prisma.ratingGuide.findFirst({
      where: { kind: "VALUES" },
      include: { versions: { orderBy: { version: "desc" }, take: 1, include: { anchors: true } } },
    });
    const version = guide?.versions[0];
    if (version) {
      for (const a of version.anchors) {
        anchors[a.item] ??= {};
        anchors[a.item][a.score] = a.text;
      }
    }
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
        <Link href="/reviews">My reviews</Link> › {review.employee.displayName}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>{title} · {review.cycle.label}</h1>
        <span className={`chip ${STATUS_CLASS[status] ?? ""}`}>{STATUS_LABEL[status] ?? status}</span>
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18 }}>
        {review.employee.displayName} · manager: {review.manager.displayName}
      </p>

      {isValues ? (
        <ValuesReviewForm
          reviewId={review.id}
          mode={mode}
          status={status}
          employeeRatings={employeeRatings.map((r) => ({ item: r.item, score: r.score, comment: r.comment }))}
          managerRatings={managerRatings.map((r) => ({ item: r.item, score: r.score, comment: r.comment }))}
          employeeReflection={review.employeeReflection ?? ""}
          valuesScore={fresh?.valuesScore ?? review.valuesScore}
          canReopen={isManager || isHR(user)}
          isEmployee={isEmployee}
          acknowledgedAt={review.acknowledgedAt ? review.acknowledgedAt.toISOString() : null}
          anchors={anchors}
        />
      ) : (
        <>
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
        </>
      )}

      <h2>Activity history</h2>
      <p className="muted">A record of what has happened to this review. This is not the system audit log.</p>
      <ReviewTimeline events={timeline} />
    </div>
  );
}
