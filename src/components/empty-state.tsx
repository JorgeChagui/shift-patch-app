import type { ReactNode } from "react";

/** What an empty list says instead: what's missing and what to do about it. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-surface px-5 py-8 text-center">
      <p className="font-bold text-ink">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-ink-muted">{children}</div>}
    </div>
  );
}
