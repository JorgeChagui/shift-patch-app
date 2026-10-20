import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CREDENTIAL_BUCKET } from "@/lib/storage-config";

// Credential files live in a private Supabase Storage bucket. Server-side only: the secret
// key bypasses storage policies. Tests mock this module. Upload rules: src/lib/storage-config.ts.

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

/** Stores the file under `contentType`, the type sniffed from its bytes (not the client's claim). */
export async function uploadCredentialFile(key: string, file: File, contentType: string): Promise<void> {
  const { error } = await storage().upload(key, file, { contentType, upsert: false });
  if (error) throw new Error(`Credential upload failed: ${error.message}`);
}

/** Removes a stored file (cleanup when the credential row couldn't be written). */
export async function deleteCredentialFile(key: string): Promise<void> {
  const { error } = await storage().remove([key]);
  if (error) throw new Error(`Credential delete failed: ${error.message}`);
}

/** Short-lived download URL for a private credential file. */
export async function signedCredentialUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await storage().createSignedUrl(key, expiresInSeconds);
  if (error) throw new Error(`Could not sign credential URL: ${error.message}`);
  return data.signedUrl;
}
