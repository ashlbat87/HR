// Notifications — placeholder display only (Stage 1).
// Shows seeded notifications so the area exists and is wired to the service
// seam. No reminder logic is built; that arrives in a later phase (U3).

import { getCurrentUser } from "@/core/auth";
import { requireSignedIn } from "@/core/access";
import { listNotifications } from "@/core/notifications";

export default async function NotificationsPage() {
  const user = requireSignedIn(await getCurrentUser());
  const items = await listNotifications(user.employeeId);

  return (
    <div>
      <h1>Notifications</h1>
      <p className="muted">
        This area is prepared for future reminders. Nothing is sent yet.
      </p>
      {items.length === 0 ? (
        <div className="empty">You have no notifications.</div>
      ) : (
        items.map((n) => (
          <div className="card" key={n.id}>
            <strong>{n.title}</strong>
            {!n.read && <span className="role-badge">new</span>}
            {n.body && <div className="muted">{n.body}</div>}
            <div className="muted" style={{ fontSize: 12 }}>
              {n.createdAt.toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
