import { sessionCookie } from "@/lib/auth";
import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { clientIp, jsonError, parseBody } from "@/lib/http";
import { authenticate } from "@/lib/services/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await parseBody(loginSchema, request);
  if (body.error) return body.error;

  const result = await authenticate(body.data, { ip: clientIp(request.headers) });
  // Failed logins are audited too, so always expire.
  expireTags(MUTATION_TAGS.login());
  if (!result.ok) return jsonError(result.status, result.error);

  const { token, session } = result.data;
  return Response.json(
    { token, user: { id: session.userId, name: session.name, role: session.role } },
    { headers: { "Set-Cookie": sessionCookie(token) } },
  );
}
