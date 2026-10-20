import { requireRole } from "@/lib/auth";
import { listAuditLog } from "@/lib/data/audit";
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

  return Response.json(await listAuditLog(query.data));
}
