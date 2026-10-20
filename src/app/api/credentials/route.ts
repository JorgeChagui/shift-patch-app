import { requireRole } from "@/lib/auth";
import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { listAllCredentials, listNurseCredentials } from "@/lib/data/credentials";
import { jsonError, parseWith, resultResponse } from "@/lib/http";
import { uploadCredential } from "@/lib/services/credentials";
import { credentialUploadSchema } from "@/lib/validation";

/** Nurses see their own credentials; admins see everyone's, with short-lived download URLs. */
export async function GET(request: Request) {
  const session = await requireRole(request, "nurse", "admin");
  if (session instanceof Response) return session;

  const credentials =
    session.role === "nurse" ? await listNurseCredentials(session.userId) : await listAllCredentials();
  return Response.json({ credentials });
}

/** Multipart upload: `file` (PDF/JPEG/PNG, max 4 MB), `expiresAt`, optional `type`. */
export async function POST(request: Request) {
  const session = await requireRole(request, "nurse");
  if (session instanceof Response) return session;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Expected multipart/form-data");
  }

  const fields = parseWith(credentialUploadSchema, {
    expiresAt: form.get("expiresAt") ?? undefined,
    type: form.get("type") || undefined,
  });
  if (fields.error) return fields.error;

  const result = await uploadCredential(session, fields.data, form.get("file"));
  expireTags(MUTATION_TAGS.uploadCredential(session.userId));
  return resultResponse(result, { status: 201 });
}
