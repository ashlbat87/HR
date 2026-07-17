import Link from "next/link";

export const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  AWAITING_MANAGER: "Awaiting manager",
  COMPLETE: "Complete",
  REOPENED: "Reopened",
  ARCHIVED: "Archived",
};
export const STATUS_CLASS: Record<string, string> = {
  NOT_STARTED: "status-outstanding",
  IN_PROGRESS: "status-inprogress",
  SUBMITTED: "status-submitted",
  AWAITING_MANAGER: "status-awaiting",
  COMPLETE: "status-completed",
  REOPENED: "status-reopened",
  ARCHIVED: "status-completed",
};
export const TYPE_LABEL: Record<string, string> = {
  QUARTERLY: "Quarterly review",
  ANNUAL_VALUES: "Annual values review",
  YEAR_END: "Year-end summary",
};

export function ReviewRow({ r }: { r: any }) {
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