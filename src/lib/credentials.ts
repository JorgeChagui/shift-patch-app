import type { DbClient } from "@/lib/db";

export const CREDENTIAL_EXPIRED_MESSAGE = "Credential expired, cannot claim shift";

/** Today's date as "YYYY-MM-DD". */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A credential is valid through its expiry date. */
export function credentialStatus(expiresAt: string, on: string = today()): "valid" | "expired" {
  return expiresAt >= on ? "valid" : "expired";
}

/**
 * Cross-phase decision 2: the nurse's latest license (newest upload, then later expiry)
 * must not expire before the shift date. No license means no claim.
 */
export async function canClaim(client: DbClient, nurseId: string, shiftDate: string): Promise<boolean> {
  const license = await client.credential.findFirst({
    where: { nurseId, type: "license" },
    orderBy: [{ uploadedAt: "desc" }, { expiresAt: "desc" }],
    select: { expiresAt: true },
  });
  return license !== null && license.expiresAt >= shiftDate;
}
