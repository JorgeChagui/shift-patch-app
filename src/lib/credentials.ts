import type { DbClient } from "@/lib/db";

export { CREDENTIAL_EXPIRED_MESSAGE, credentialStatus, today } from "@/lib/credential-status";

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
