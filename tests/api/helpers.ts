import { POST as loginHandler } from "@/app/api/auth/login/route";
import { db } from "@/lib/db";
import { seed } from "../../prisma/seed";

export const EMAILS = {
  maria: "maria.lopez@example.com",
  james: "james.cook@example.com",
  agencyA: "admin@sunrisehealth.example",
  agencyB: "admin@metrocare.example",
  admin: "alex.kim@example.com",
} as const;

export type Account = keyof typeof EMAILS;

/** Wipes and reseeds the test DB with the spec sample data (shift_id_seq back to 3). */
export function resetDb() {
  return seed(db);
}

type RequestOptions = {
  method?: string;
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/** Builds a Request for calling a route handler directly (no server needed). */
export function req(path: string, { method = "GET", token, body, headers, signal }: RequestOptions = {}) {
  const init: RequestInit = { method, headers: { ...headers }, signal };
  if (token) (init.headers as Record<string, string>).authorization = `Bearer ${token}`;
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)["content-type"] = "application/json";
  }
  return new Request(`http://localhost${path}`, init);
}

/** Route context with the given params, as Next passes it. */
export function ctx<P extends Record<string, string>>(params: P) {
  return { params: Promise.resolve(params) };
}

const tokens = new Map<Account, string>();

/** Logs in through the real login route and caches the token (tokens survive reseeds). */
export async function login(account: Account): Promise<string> {
  const cached = tokens.get(account);
  if (cached) return cached;
  const res = await loginHandler(req("/api/auth/login", {
    method: "POST",
    body: { email: EMAILS[account], password: "Trial2026!" },
  }));
  if (res.status !== 200) throw new Error(`login failed for ${account}: ${res.status}`);
  const { token } = (await res.json()) as { token: string };
  tokens.set(account, token);
  return token;
}

/** Newest audit row, for asserting that a mutation was recorded. */
export function latestAudit() {
  return db.auditLog.findFirst({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
}
