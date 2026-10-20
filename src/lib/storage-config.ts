// Credential upload rules, shared by the service, src/lib/storage.ts and scripts/storage-setup.ts.
// No secrets here, so scripts can import it without pulling in the Storage client.

export const CREDENTIAL_BUCKET = "credentials";
// Vercel caps request bodies at 4.5 MB, so uploads (sent through a Server Action) stay under it.
export const MAX_CREDENTIAL_BYTES = 4 * 1024 * 1024;
export const ALLOWED_CREDENTIAL_TYPES = ["application/pdf", "image/jpeg", "image/png"];
// Room for the multipart envelope and the other fields around a maximum-size file.
export const MAX_CREDENTIAL_REQUEST_BYTES = MAX_CREDENTIAL_BYTES + 64 * 1024;

const SIGNATURES: { type: string; bytes: number[] }[] = [
  { type: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

/** The file's real type from its first bytes, or null if it isn't a PDF, JPEG or PNG. */
export function sniffCredentialType(head: Uint8Array): string | null {
  const match = SIGNATURES.find(({ bytes }) => bytes.every((byte, i) => head[i] === byte));
  return match?.type ?? null;
}
