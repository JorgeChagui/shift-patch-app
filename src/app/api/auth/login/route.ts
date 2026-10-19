import bcrypt from "bcryptjs";
import { writeAudit } from "@/lib/audit";
import { sessionCookie, signToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

const INVALID = "Invalid email or password";
// Compared against when the email is unknown, so both failures take about as long.
const DUMMY_HASH = "$2b$10$8/pLYbne6L3lUjwCfZgN9OkPo3Y3aSG5d0JM38D13Ir23XK35yvyC";

export async function POST(request: Request) {
  const body = await parseBody(loginSchema, request);
  if (body.error) return body.error;

  const user = await db.user.findUnique({ where: { email: body.data.email } });
  const ok = await bcrypt.compare(body.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return jsonError(401, INVALID);

  const token = await signToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    agencyId: user.agencyId,
  });
  await writeAudit(db, { actorId: user.id, action: "auth.login", entityType: "user", entityId: user.id });

  return Response.json(
    { token, user: { id: user.id, name: user.name, role: user.role } },
    { headers: { "Set-Cookie": sessionCookie(token) } },
  );
}
