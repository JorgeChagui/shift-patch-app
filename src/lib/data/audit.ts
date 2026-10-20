import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { toAuditEntryDto, type AuditPageDto } from "@/lib/dto";
import type { AuditQuery } from "@/lib/validation";

/** Audit trail, newest first, paged with `limit` and `cursor` (an entry id). */
export async function listAuditLog({ limit, cursor }: AuditQuery): Promise<AuditPageDto> {
  "use cache";
  cacheLife("marketplace");
  cacheTag(TAGS.auditLog);

  const rows = await db.auditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, limit);

  return {
    entries: page.map(toAuditEntryDto),
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
  };
}
