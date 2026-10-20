"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotify } from "@/hooks/use-notify";

const TONE = {
  success: { box: "border-success/40 bg-success-wash text-success-ink", Icon: CircleCheck },
  error: { box: "border-danger/40 bg-danger-wash text-danger", Icon: CircleAlert },
} as const;

/** The one confirmation surface for success and error results (`notification-banner`). */
export function NotificationBanner() {
  const { notice, dismiss } = useNotify();
  if (!notice) return null;

  const { box, Icon } = TONE[notice.kind];
  return (
    <div
      key={notice.id}
      data-testid="notification-banner"
      role={notice.kind === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 animate-in fade-in slide-in-from-top-1",
        box,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1 font-medium">{notice.message}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-m-1 rounded-md p-1 opacity-70 hover:opacity-100"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
