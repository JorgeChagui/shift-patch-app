import { requireRole } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await requireRole(request);
  if (session instanceof Response) return session;
  return Response.json({
    user: { id: session.userId, name: session.name, role: session.role, agencyId: session.agencyId },
  });
}
