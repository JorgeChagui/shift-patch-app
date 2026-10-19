import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseWith } from "@/lib/http";
import { auditQuerySchema } from "@/lib/validation";

/** Admin audit trail, newest first, paged with `limit` and `cursor` (an entry id). */
export async function GET(request: Request) {
  const session = await requireRole(request, "admin");
  if (session instanceof Response) return session;

  const search = new URL(request.url).searchParams;
  const query = parseWith(auditQuerySchema, {
    limit: search.get("limit") ?? undefined,
    cursor: search.get("cursor") ?? undefined,
  });
  if (query.error) return query.error;
  const { limit, cursor } = query.data;

  const rows = await db.auditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, limit);

  return Response.json({
    entries: page.map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.actorId,
      actorName: row.actor?.name ?? null,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
  });
}
