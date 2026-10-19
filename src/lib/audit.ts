import type { Prisma } from "@/generated/prisma/client";
import type { DbClient } from "@/lib/db";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonObject;
};

/**
 * Records a state change. Pass the transaction client so the change and its
 * audit row commit (or roll back) together.
 */
export function writeAudit(client: DbClient, entry: AuditEntry) {
  return client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ?? {},
    },
  });
}
