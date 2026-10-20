"use client";

import { useSearchParams } from "next/navigation";

/** Carries `?next=` (set by proxy.ts) into the login form, so the user lands where they were going. */
export function NextField() {
  const next = useSearchParams().get("next");
  return next ? <input type="hidden" name="next" value={next} /> : null;
}
