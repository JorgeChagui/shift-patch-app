import { POLL_INTERVAL_MS } from "@/hooks/use-live-shifts";
import { cn } from "@/lib/utils";

/** Whether the board is streaming changes or checking for them on a timer. */
export function LiveIndicator({ mode }: { mode: "live" | "polling" }) {
  const live = mode === "live";
  return (
    <p role="status" className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <span aria-hidden className="relative flex size-2.5">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-60" />}
        <span className={cn("relative inline-flex size-2.5 rounded-full", live ? "bg-mint" : "bg-warning")} />
      </span>
      {live ? "Live" : `Polling every ${POLL_INTERVAL_MS / 1000} s`}
    </p>
  );
}
