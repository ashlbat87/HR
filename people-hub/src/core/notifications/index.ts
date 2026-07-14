// Notifications service seam.
//
// Stage 1: read-only display of seeded placeholder notifications. The service
// boundary exists so in-app notifications and, later, email reminders (U3) can
// be added WITHOUT redesign — a future EmailChannel just implements `send`.

import { prisma } from "@/shared/lib/prisma";

export interface NotificationView {
  id: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  read: boolean;
  createdAt: Date;
}

export async function listNotifications(
  recipientId: string
): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    linkPath: n.linkPath,
    read: n.readAt !== null,
    createdAt: n.createdAt,
  }));
}

export async function unreadCount(recipientId: string): Promise<number> {
  return prisma.notification.count({
    where: { recipientId, readAt: null },
  });
}

// Future seam (not called in Stage 1): a channel sends a notification.
// EmailChannel will implement this later with no schema change.
export interface NotificationChannel {
  send(input: {
    recipientId: string;
    title: string;
    body?: string;
    linkPath?: string;
  }): Promise<void>;
}
