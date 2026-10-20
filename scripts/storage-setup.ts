import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { ALLOWED_CREDENTIAL_TYPES, CREDENTIAL_BUCKET, MAX_CREDENTIAL_BYTES } from "../src/lib/storage-config";

// Creates (or updates) the private credentials bucket on a hosted Supabase project, matching
// [storage.buckets.credentials] in supabase/config.toml. Idempotent.
// Production: `npm run storage:setup:prod` (reads .env.production.local).

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  const storage = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage;

  const options = { public: false, fileSizeLimit: MAX_CREDENTIAL_BYTES, allowedMimeTypes: ALLOWED_CREDENTIAL_TYPES };
  const { data: existing } = await storage.getBucket(CREDENTIAL_BUCKET);
  const { error } = existing
    ? await storage.updateBucket(CREDENTIAL_BUCKET, options)
    : await storage.createBucket(CREDENTIAL_BUCKET, options);
  if (error) throw new Error(`Bucket setup failed: ${error.message}`);
  console.log(`Bucket "${CREDENTIAL_BUCKET}" ${existing ? "updated" : "created"} (private, ${MAX_CREDENTIAL_BYTES} bytes max).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
