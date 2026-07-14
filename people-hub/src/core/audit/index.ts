// Audit logging. Append-only. Every consequential action records who/what/when.
import { prisma } from "@/shared/lib/prisma";

export async function recordAudit(params: {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  detail?: string;
}): Promise<void> {
  await prisma.auditLog.create({ data: params });
}
