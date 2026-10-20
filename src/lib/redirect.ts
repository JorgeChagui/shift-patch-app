const BASE = "http://shiftpatch.invalid";

/**
 * A `?next=` value as a same-site path, or null. Resolving against a fixed origin catches
 * everything browsers treat as another host (`//x`, `/\x`, `/\t/x`, `https://x`).
 */
export function safeNext(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/")) return null;
  if (next.includes("\\") || /[\u0000-\u001f\u007f]/.test(next)) return null;
  try {
    const url = new URL(next, BASE);
    return url.origin === BASE ? url.pathname + url.search : null;
  } catch {
    return null;
  }
}
