import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CredentialDto } from "@/lib/dto";
import { listNurseCredentials } from "@/lib/data/credentials";
import { formatShiftDate, formatTimestamp } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { CREDENTIAL_TYPE_LABEL } from "./credential-labels";

function ValidityBadge({ status }: { status: CredentialDto["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-sm font-medium",
        status === "valid" ? "bg-success-wash text-success-ink" : "bg-danger-wash text-danger",
      )}
    >
      {status}
    </span>
  );
}

/** The nurse's uploads, newest first. The newest license is the one that counts for claims. */
export async function CredentialList() {
  const session = await requireSession("nurse");
  const credentials = await listNurseCredentials(session.userId);

  if (credentials.length === 0) {
    return <EmptyState title="No credentials yet">Upload your nursing license to start claiming shifts.</EmptyState>;
  }
  return (
    <div className="rounded-lg border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded (UTC)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {credentials.map((credential) => (
            <TableRow key={credential.id}>
              <TableCell className="font-bold">{CREDENTIAL_TYPE_LABEL[credential.type]}</TableCell>
              <TableCell className="max-w-48 truncate">{credential.fileName ?? "None"}</TableCell>
              <TableCell>{formatShiftDate(credential.expiresAt)}</TableCell>
              <TableCell>
                <ValidityBadge status={credential.status} />
              </TableCell>
              <TableCell className="text-ink-muted">{formatTimestamp(credential.uploadedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
