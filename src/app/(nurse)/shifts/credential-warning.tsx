import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { credentialStatus, latestLicense } from "@/lib/credential-status";
import { listNurseCredentials } from "@/lib/data/credentials";
import { formatShiftDate } from "@/lib/format";
import { requireSession } from "@/lib/session";

/** Shown when the nurse's latest license is missing or expired: claims will be refused. */
export async function CredentialWarning() {
  const session = await requireSession("nurse");
  const license = latestLicense(await listNurseCredentials(session.userId));
  if (license && credentialStatus(license.expiresAt) === "valid") return null;

  return (
    <div role="note" className="flex gap-3 rounded-lg border border-warning/40 bg-warning-wash px-4 py-3 text-warning-ink">
      <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-bold">
          {license ? `Your license expired on ${formatShiftDate(license.expiresAt)}` : "You haven't uploaded a license"}
        </p>
        <p>
          You can&apos;t claim shifts until you{" "}
          <Link href="/credentials" className="font-bold underline underline-offset-2">
            upload a current license
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
