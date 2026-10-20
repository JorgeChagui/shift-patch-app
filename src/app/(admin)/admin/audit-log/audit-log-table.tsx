import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditEntryDto } from "@/lib/dto";
import { formatAuditAction, formatMetadata, formatTimestamp } from "@/lib/format";

/** The audit trail (`audit-log-table`): time, actor, action, entity, details. */
export function AuditLogTable({ entries }: { entries: AuditEntryDto[] }) {
  return (
    <div className="rounded-lg border bg-surface">
      <Table data-testid="audit-log-table">
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-ink-muted">
                Nothing recorded yet.
              </TableCell>
            </TableRow>
          )}
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap tabular">
                <time dateTime={entry.createdAt}>{formatTimestamp(entry.createdAt)}</time>
              </TableCell>
              <TableCell>{entry.actorName ?? <span className="text-ink-muted">System</span>}</TableCell>
              <TableCell className="font-bold" title={entry.action}>
                {formatAuditAction(entry.action)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {entry.entityType} <span className="text-ink-muted">{entry.entityId}</span>
              </TableCell>
              <TableCell className="max-w-72 whitespace-normal text-ink-muted">{formatMetadata(entry.metadata)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
