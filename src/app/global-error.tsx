"use client";

import "./globals.css";

/** Replaces the root layout when it fails, so it brings its own <html> and <body>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-4 font-sans">
        <main role="alert" className="max-w-md space-y-3">
          <h1 className="text-2xl">ShiftPatch couldn&apos;t load</h1>
          <p className="text-ink-muted">Something went wrong on our side. Reload to try again.</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-brand px-4 py-2 font-bold text-white hover:bg-brand-ink"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
