// Audit Timeline (user-facing) display. Renders the chronological activity
// history for a review. Visibility filtering (hiding MANAGER_OPENED from the
// employee) happens upstream in getVisibleTimeline; this renders what it is given.

import type { ReviewEvent, ReviewEventType } from "@prisma/client";

const LABELS: Record<ReviewEventType, string> = {
  CREATED: "Review created",
  DRAFT_SAVED: "Draft saved",
  SUBMITTED: "Submitted",
  RETURNED: "Returned for changes",
  MANAGER_OPENED: "Manager opened",
  MANAGER_COMPLETED: "Manager completed",
  REOPENED: "Reopened",
  CLOSED: "Closed",
};

function formatWhen(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(at));
}

export function ReviewTimeline({ events }: { events: ReviewEvent[] }) {
  if (events.length === 0) {
    return <div className="empty">No activity yet.</div>;
  }
  return (
    <ol className="timeline">
      {events.map((e) => (
        <li key={e.id} className="timeline-item">
          <div className="timeline-dot" aria-hidden="true" />
          <div className="timeline-body">
            <div className="timeline-action">
              <strong>{LABELS[e.type]}</strong>
            </div>
            <div className="muted timeline-meta">
              {formatWhen(e.at)} · {e.actorName}
            </div>
            {e.detail ? <div className="timeline-detail">{e.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
