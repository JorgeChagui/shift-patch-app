import { MUTATION_TAGS, expireTags } from "@/lib/cache-tags";
import { listShifts } from "@/lib/data/shifts";
import { parseBody, resultResponse } from "@/lib/http";
import { createShift } from "@/lib/services/shifts";
import { requireRole } from "@/lib/session";
import { shiftCreateSchema } from "@/lib/validation";

/** The marketplace: every shift across all agencies (any signed-in role, decision 3). */
export async function GET(request: Request) {
  const session = await requireRole(request);
  if (session instanceof Response) return session;
  return Response.json({ shifts: await listShifts() });
}

/** An agency posts an open shift, always under its own agencyId. */
export async function POST(request: Request) {
  const session = await requireRole(request, "agency");
  if (session instanceof Response) return session;

  const body = await parseBody(shiftCreateSchema, request);
  if (body.error) return body.error;

  const result = await createShift(session, body.data);
  expireTags(MUTATION_TAGS.createShift());
  return resultResponse(result, { status: 201 });
}
