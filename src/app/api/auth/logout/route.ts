import { clearSessionCookie, requestToken } from "@/lib/auth";
import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { revokeSession } from "@/lib/services/auth";

/** Revokes the caller's token (Bearer or cookie) and clears the cookie. */
export async function POST(request: Request) {
  const found = requestToken(request);
  if (found) {
    await revokeSession(found.token);
    expireTags(MUTATION_TAGS.login());
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
