import type { z } from "zod";

/** Every error response: `{ "error": "<message>" }`. */
export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
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
  if (!result.success) return { error: jsonError(400, firstIssue(result.error)) };
  return { data: result.data };
}
