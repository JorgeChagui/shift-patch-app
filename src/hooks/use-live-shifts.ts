"use client";

import { useCallback, useState } from "react";
import type { AdminShiftsDto } from "@/lib/dto";
import { useEventSource } from "@/hooks/use-event-source";
import { usePolling } from "@/hooks/use-polling";

export const POLL_INTERVAL_MS = 10_000;

/**
 * The admin shift board, kept current: refetches on the SSE `shifts-changed` event (and on
 * every `ready`, to catch changes made while reconnecting). If the stream fails, polls instead.
 */
export function useLiveShifts(initial: AdminShiftsDto) {
  const [data, setData] = useState(initial);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/admin/shifts", { cache: "no-store" });
    if (res.ok) setData((await res.json()) as AdminShiftsDto);
  }, []);

  const stream = useEventSource("/api/admin/stream", {
    ready: refetch,
    "shifts-changed": refetch,
  });
  const polling = stream === "failed";
  usePolling(refetch, POLL_INTERVAL_MS, polling);

  return { data, mode: polling ? "polling" : "live" } as const;
}
