// Pure credential rules, safe to import from client components.

export const CREDENTIAL_EXPIRED_MESSAGE = "Credential expired, cannot claim shift";

/** Today's date as "YYYY-MM-DD". */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A credential is valid through its expiry date. */
export function credentialStatus(expiresAt: string, on: string = today()): "valid" | "expired" {
  return expiresAt >= on ? "valid" : "expired";
}

type LicenseLike = { type: string; expiresAt: string; uploadedAt: string };

/**
 * Cross-phase decision 2: the license that counts is the newest upload (ties: later expiry),
 * even if an older one expires later.
 */
export function latestLicense<T extends LicenseLike>(credentials: readonly T[]): T | null {
  let latest: T | null = null;
  for (const credential of credentials) {
    if (credential.type !== "license") continue;
    if (
      !latest ||
      credential.uploadedAt > latest.uploadedAt ||
      (credential.uploadedAt === latest.uploadedAt && credential.expiresAt > latest.expiresAt)
    ) {
      latest = credential;
    }
  }
  return latest;
}
