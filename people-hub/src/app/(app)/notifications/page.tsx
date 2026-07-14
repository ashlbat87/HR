// Notifications — display only. Shows seeded notifications so the area exists.
// No reminder logic is built; that is a future phase. Mark-as-read and category
// filtering are presented as UI affordances only (not yet wired to a backend).

import { getCurrentUser } from "@/core/auth";
import { requireSignedIn } from "@/core/access";
import { listNotifications } from "@/core/notifications";

export default async function NotificationsPage() {
  const user = requireSignedIn(await getCurrentUser());
  const items = await listNotifications(user.employeeId);
  const unread = items.filter((n) => !n.read).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        {unread > 0 && (
          <span className="chip status-submitted">{unread} unread</span>
        )}
      </div>
      <p className="muted">
        Prepared for future reminders. Sending is not yet active.{" "}
        <span className="coming-soon">Reminders coming soon</span>
      </p>

      {/* Category filter affordance (display only, not yet wired) */}
      <div className="filters" style={{ marginTop: 8 }}>
        <span className="chip status-inprogress">All</span>
        <span className="chip">Reviews</span>
        <span className="chip">Team</span>
        <span className="chip">System</span>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          You have no notifications. When reminders are switched on, they will
          appear here.
        </div>
      ) : (
        <div>
          {items.map((n) => (
            <div
              className="card"
              key={n.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                background: n.read ? "var(--surface)" : "var(--purple-subtle)",
              }}
            >
              <span
                className="timeline-dot"
                style={{ background: n.read ? "var(--n40)" : "var(--purple)", marginTop: 6 }}
                aria-hidden="true"
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
                {n.body && <div className="muted" style={{ fontSize: 14 }}>{n.body}</div>}
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {n.createdAt.toLocaleString()}
                </div>
              </div>
              {!n.read && (
                <span className="coming-soon" title="Mark-as-read is a future feature">
                  Mark read
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
