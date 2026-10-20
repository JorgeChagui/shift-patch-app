import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listAuditLog } from "@/lib/data/audit";
import { requireSession } from "@/lib/session";
import { auditQuerySchema } from "@/lib/validation";
import { AuditLogTable } from "./audit-log-table";

const PAGE_SIZE = 50;

/** Reads `?cursor=` (an entry id) and shows that page of the log. */
export async function AuditLogSection({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSession("admin");
  const { cursor } = await searchParams;
  const query = auditQuerySchema.safeParse({ limit: PAGE_SIZE, cursor });
  const page = await listAuditLog(query.success ? query.data : { limit: PAGE_SIZE });

  return (
    <div className="space-y-4">
      <AuditLogTable entries={page.entries} />
      <div className="flex gap-2">
        {query.success && query.data.cursor && (
          <Button asChild variant="outline">
            <Link href="/admin/audit-log">Back to newest</Link>
          </Button>
        )}
        {page.nextCursor && (
          <Button asChild variant="outline">
            <Link href={`/admin/audit-log?cursor=${encodeURIComponent(page.nextCursor)}`}>Older entries</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
