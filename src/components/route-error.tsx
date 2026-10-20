"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** The body of every error.tsx: what happened, and a retry that re-renders the segment. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="rounded-lg border border-danger/40 bg-danger-wash px-5 py-6">
      <h1 className="text-xl text-danger">This page couldn&apos;t load</h1>
      <p className="mt-1 max-w-prose text-ink">
        Something went wrong on our side while loading this page. Try again; if it keeps happening, sign out
        and back in.
      </p>
      {error.digest && <p className="mt-2 text-sm text-ink-muted">Reference: {error.digest}</p>}
      <Button onClick={reset} variant="outline" className="mt-4">
        <RotateCcw aria-hidden />
        Try again
      </Button>
    </div>
  );
}
