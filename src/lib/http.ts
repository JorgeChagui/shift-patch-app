import type { z } from "zod";
import type { ServiceResult } from "@/lib/result";
import { formatZodError } from "@/lib/validation";

/** Every error response: `{ "error": "<message>" }`. */
export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

type Parsed<T> = { data: T; error?: never } | { data?: never; error: Response };

/** Parses a JSON body; a 400 response on invalid JSON or the first zod issue. */
export async function parseBody<S extends z.ZodType>(
  schema: S,
  request: Request,
): Promise<Parsed<z.infer<S>>> {
  let body: unknown;
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return { error: jsonError(400, "Invalid JSON body") };
  }
  return parseWith(schema, body);
}

/** Validates route params, query params or any other plain value. */
export function parseWith<S extends z.ZodType>(schema: S, value: unknown): Parsed<z.infer<S>> {
  const result = schema.safeParse(value);
  if (!result.success) return { error: jsonError(400, formatZodError(result.error)) };
  return { data: result.data };
}

/** Turns a service result into the API response: the data as JSON, or `{ error }` with its status. */
export function resultResponse<T>(result: ServiceResult<T>, init?: ResponseInit): Response {
  return result.ok ? Response.json(result.data, init) : jsonError(result.status, result.error);
}

/** The caller's IP: the first `x-forwarded-for` hop (Vercel overwrites the header, so it can't be spoofed there). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
