import { sessionCookie } from "@/lib/auth";
import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { jsonError, parseBody } from "@/lib/http";
import { authenticate } from "@/lib/services/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await parseBody(loginSchema, request);
  if (body.error) return body.error;

  const result = await authenticate(body.data);
  if (!result.ok) return jsonError(result.status, result.error);
  expireTags(MUTATION_TAGS.login());

  const { token, session } = result.data;
  return Response.json(
    { token, user: { id: session.userId, name: session.name, role: session.role } },
    { headers: { "Set-Cookie": sessionCookie(token) } },
  );
}
