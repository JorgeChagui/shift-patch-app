import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Credential files live in a private Supabase Storage bucket. Server-side only: the secret
// key bypasses storage policies. Tests mock this module.

export const CREDENTIAL_BUCKET = "credentials";
export const MAX_CREDENTIAL_BYTES = 5 * 1024 * 1024;
export const ALLOWED_CREDENTIAL_TYPES = ["application/pdf", "image/jpeg", "image/png"];

let client: SupabaseClient | undefined;

function storage() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client.storage.from(CREDENTIAL_BUCKET);
}

export async function uploadCredentialFile(key: string, file: File): Promise<void> {
  const { error } = await storage().upload(key, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Credential upload failed: ${error.message}`);
}

/** Short-lived download URL for a private credential file. */
export async function signedCredentialUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await storage().createSignedUrl(key, expiresInSeconds);
  if (error) throw new Error(`Could not sign credential URL: ${error.message}`);
  return data.signedUrl;
}
