import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { shiftChangesStream } from "@/lib/stream";

// The stream closes itself at ~55s, inside this limit; the client reconnects.
export const maxDuration = 60;

/** SSE: `shifts-changed` whenever the DB changes, `: ping` heartbeats otherwise. */
export async function GET(request: Request) {
  const session = await requireRole(request, "admin");
  if (session instanceof Response) return session;

  return new Response(shiftChangesStream(db, { signal: request.signal }), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
