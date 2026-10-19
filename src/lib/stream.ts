import type { DbClient } from "@/lib/db";

// Admin live updates over SSE. No in-memory emitter (serverless): each stream polls the DB
// for the latest change and tells the client to refetch. It ends itself before the function
// time limit; EventSource reconnects automatically.

export type StreamOptions = {
  pollMs?: number;
  maxMs?: number;
  signal?: AbortSignal;
};

/** Changes whenever a state change is audited or a shift row is updated. */
export async function changeVersion(client: DbClient): Promise<string> {
  const [audit, shift] = await Promise.all([
    client.auditLog.aggregate({ _max: { createdAt: true } }),
    client.shift.aggregate({ _max: { updatedAt: true }, _count: true }),
  ]);
  return [
    audit._max.createdAt?.toISOString() ?? "",
    shift._max.updatedAt?.toISOString() ?? "",
    shift._count,
  ].join("|");
}

export function shiftChangesStream(
  client: DbClient,
  { pollMs = 3000, maxMs = 55_000, signal }: StreamOptions = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return new ReadableStream({
    async start(controller) {
      const startedAt = Date.now();
      const send = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        controller.close();
      };
      signal?.addEventListener("abort", close, { once: true });

      let version: string;
      try {
        version = await changeVersion(client);
      } catch {
        close();
        return;
      }
      send(`retry: ${pollMs}\nevent: ready\ndata: {}\n\n`);

      const tick = async () => {
        if (closed) return;
        if (Date.now() - startedAt >= maxMs) return close();
        try {
          const next = await changeVersion(client);
          if (next !== version) {
            version = next;
            send(`event: shifts-changed\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
          } else {
            send(": ping\n\n");
          }
        } catch {
          return close();
        }
        if (!closed) timer = setTimeout(tick, pollMs);
      };
      timer = setTimeout(tick, pollMs);
    },
    cancel() {
      closed = true;
      clearTimeout(timer);
    },
  });
}
