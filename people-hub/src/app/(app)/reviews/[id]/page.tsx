import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import Link from "next/link";
import { canViewReview, managerOpen, getVisibleTimeline, assembleYearEndData } from "@/modules/performance/review-workflow";
import { ReviewForm } from "../ReviewForm";
import { ValuesReviewForm } from "../ValuesReviewForm";
import { YearEndForm } from "../YearEndForm";
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
  const isYearEnd = review.type === "YEAR_END";
  const title = isYearEnd ? "Year-end summary" : isValues ? "Annual values review" : "Quarterly review";

  // For year-end summaries, assemble the quarterly + values data.
  let yearEnd: Awaited<ReturnType<typeof assembleYearEndData>> | null = null;
  if (isYearEnd) {
    yearEnd = await assembleYearEndData(review.employeeId);
  }

  // Load the relevant rating-guide anchors to show inline.
  // Values: the single VALUES guide. Quarterly: the reviewed employee's department
  // PERFORMANCE guide (chosen by their ratingGuideCategory).
  let anchors: Record<string, Record<number, string>> = {};
  {
    const guide = isValues
      ? await prisma.ratingGuide.findFirst({
          where: { kind: "VALUES" },
          include: { versions: { orderBy: { version: "desc" }, take: 1, include: { anchors: true } } },
        })
      : review.employee.ratingGuideCategory
      ? await prisma.ratingGuide.findFirst({
          where: { kind: "PERFORMANCE", category: review.employee.ratingGuideCategory },
          include: { versions: { orderBy: { version: "desc" }, take: 1, include: { anchors: true } } },
        })
      : null;
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
      {!isYearEnd ? (
        <div style={{ background: "var(--purple-subtle)", border: "0.5px solid #E7E3F8", borderRadius: 14, padding: "22px 26px", position: "relative", overflow: "hidden", marginBottom: 24 }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "var(--purple)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--purple-dark)", fontWeight: 600 }}>{title} · {review.cycle.label}</div>
            <span className={`chip ${STATUS_CLASS[status] ?? ""}`}>{STATUS_LABEL[status] ?? status}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 21, color: "#1D102C" }}>{review.employee.displayName}</h1>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
            {review.employee.role ?? ""}{review.employee.role ? " · " : ""}Manager: {review.manager.displayName}
          </p>
        </div>
      ) : null}
 {isYearEnd ? (
        <YearEndForm
          reviewId={review.id}
          mode={mode}
          status={status}
          isEmployee={isEmployee}
          employeeName={review.employee.displayName}
          employeeRole={review.employee.role ?? ""}
          managerName={review.manager.displayName}
          canReopenArchived={isHR(user)}
          quarters={(yearEnd?.quarters ?? []).map((q) => ({ label: q.cycle.label, quarterlyScore: q.quarterlyScore }))}
          quartersCompleted={yearEnd?.quartersCompleted ?? 0}
          annualPerformanceScore={fresh?.annualPerformanceScore ?? review.annualPerformanceScore ?? yearEnd?.annualPerformanceScore ?? null}
          valuesScore={yearEnd?.valuesScore ?? null}
          valuesComplete={yearEnd?.valuesComplete ?? false}
          employeeOverallAssessment={review.employeeOverallAssessment ?? ""}
          managerOverallAssessment={review.managerOverallAssessment ?? ""}
          areasForGrowth={review.areasForGrowth ?? ""}
          developmentPlan={review.developmentPlan ?? ""}
          acknowledgedAt={review.acknowledgedAt ? review.acknowledgedAt.toISOString() : null}
        />
      ) : isValues ? (
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
            anchors={anchors}
          />
        </>
      )}

      <h2>Activity history</h2>
      <p className="muted">A record of what has happened to this review. This is not the system audit log.</p>
      <ReviewTimeline events={timeline} />
    </div>
  );
}
