import { SignJWT, base64url } from "jose";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { GET as agencyShifts } from "@/app/api/agencies/[agencyId]/shifts/route";
import { POST as uploadCredential } from "@/app/api/credentials/route";
import { POST as readNotification } from "@/app/api/notifications/[id]/read/route";
import { GET as listShifts, POST as createShift } from "@/app/api/shifts/route";
import { POST as cancel } from "@/app/api/shifts/[id]/cancel/route";
import { SESSION_COOKIE, signToken, type Session } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeNext } from "@/lib/redirect";
import { MAX_FAILURES_PER_EMAIL, TOO_MANY_ATTEMPTS_MESSAGE } from "@/lib/services/auth";
import { EMAILS, ctx, login, req, resetDb } from "./helpers";

// Phase 5 (P5-11): each test tries to misuse the API and expects the control to hold.

vi.mock("@/lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage")>()),
  uploadCredentialFile: vi.fn(async () => {}),
}));
const storage = await import("@/lib/storage");

beforeEach(async () => {
  vi.mocked(storage.uploadCredentialFile).mockClear();
  await resetDb();
});
afterAll(() => db.$disconnect());

const maria: Session = { userId: "nurse-1", role: "nurse", name: "Maria Lopez", agencyId: null };
const agencyA: Session = { userId: "agency-a-admin", role: "agency", name: "Sunrise Health Staffing", agencyId: "agency-a" };
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

const meWith = (headers: Record<string, string>) => me(req("/api/auth/me", { headers }));
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

describe("forged and replayed tokens get 401", () => {
  it("rejects alg: none", async () => {
    const encode = (value: object) => base64url.encode(JSON.stringify(value));
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${encode({ alg: "none", typ: "JWT" })}.${encode({
      sub: "admin-1", role: "admin", name: "Alex Kim", agencyId: null,
      jti: "x", iss: "shiftpatch", aud: "shiftpatch", iat: now, exp: now + 3600,
    })}.`;
    expect((await meWith(bearer(unsigned))).status).toBe(401);
  });

  it("rejects a token for another audience or issuer, or without a jti", async () => {
    const base = () =>
      new SignJWT({ role: "admin", name: "Alex Kim", agencyId: null })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("admin-1")
        .setIssuedAt()
        .setExpirationTime("1h");
    const tokens = await Promise.all([
      base().setJti("a").setIssuer("shiftpatch").setAudience("other-app").sign(secret()),
      base().setJti("b").setIssuer("evil").setAudience("shiftpatch").sign(secret()),
      base().setIssuer("shiftpatch").setAudience("shiftpatch").sign(secret()),
    ]);
    for (const token of tokens) expect((await meWith(bearer(token))).status).toBe(401);
  });

  it("rejects a role the app doesn't know", async () => {
    const token = await new SignJWT({ role: "superuser", name: "x", agencyId: null })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin-1")
      .setJti("c")
      .setIssuer("shiftpatch")
      .setAudience("shiftpatch")
      .setExpirationTime("1h")
      .sign(secret());
    expect((await meWith(bearer(token))).status).toBe(401);
  });

  it("treats a malformed cookie as signed out, not a 500", async () => {
    const res = await meWith({ cookie: `${SESSION_COOKIE}=%E0%A4%A` });
    expect(res.status).toBe(401);
    expect(await res.json()).toStrictEqual({ error: "Unauthorized" });
  });

  it("rejects a token after logout (Bearer and cookie)", async () => {
    for (const headers of [
      (token: string) => bearer(token),
      (token: string) => ({ cookie: `${SESSION_COOKIE}=${token}` }),
    ]) {
      const token = await signToken(maria);
      expect((await meWith(headers(token))).status).toBe(200);
      const out = await logout(req("/api/auth/logout", { method: "POST", headers: headers(token) }));
      expect(out.status).toBe(200);
      expect((await meWith(headers(token))).status).toBe(401);
    }
    // Only that token: another session for the same user still works.
    expect((await meWith(bearer(await signToken(maria)))).status).toBe(200);
    expect(await db.auditLog.count({ where: { action: "auth.logout", actorId: "nurse-1" } })).toBe(2);
  });
});

describe("access control", () => {
  it("returns 403 for the wrong role or another agency", async () => {
    const nurse = await login("maria");
    const shift = { role: "RN", date: "2026-11-01", startTime: "07:00", endTime: "19:00" };
    expect((await createShift(req("/api/shifts", { method: "POST", token: nurse, body: shift }))).status).toBe(403);

    const agencyB = await login("agencyB");
    const read = await agencyShifts(req("/api/agencies/agency-a/shifts", { token: agencyB }), ctx({ agencyId: "agency-a" }));
    expect(read.status).toBe(403);
    const cancelled = await cancel(
      req("/api/shifts/shift-2/cancel", { method: "POST", token: agencyB, body: { reason: "no-show" } }),
      ctx({ id: "shift-2" }),
    );
    expect(cancelled.status).toBe(403);
    expect(await db.shift.findUnique({ where: { id: "shift-2" } })).toMatchObject({ status: "filled" });
  });

  it("can't mark another user's notification as read", async () => {
    const note = await db.notification.create({ data: { userId: "nurse-1", message: "Shift claimed" } });
    const res = await readNotification(
      req(`/api/notifications/${note.id}/read`, { method: "POST", token: await login("james") }),
      ctx({ id: note.id }),
    );
    expect(res.status).toBe(404);
    expect(await db.notification.findUnique({ where: { id: note.id } })).toMatchObject({ readAt: null });
  });
});

describe("login throttling", () => {
  const attempt = (email: string, password: string, ip: string) =>
    loginHandler(req("/api/auth/login", { method: "POST", body: { email, password }, headers: { "x-forwarded-for": ip } }));

  it("blocks an email after repeated failures, even with the right password", async () => {
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      expect((await attempt(EMAILS.maria, "wrong", `10.0.0.${i}`)).status).toBe(401);
    }
    const blocked = await attempt(EMAILS.maria, "Trial2026!", "10.0.1.1");
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toStrictEqual({ error: TOO_MANY_ATTEMPTS_MESSAGE });

    // Other accounts are unaffected.
    expect((await attempt(EMAILS.james, "Trial2026!", "10.0.1.1")).status).toBe(200);
    expect(await db.auditLog.count({ where: { action: "auth.login_failed" } })).toBe(MAX_FAILURES_PER_EMAIL);
  });

  it("blocks an IP spraying many emails", async () => {
    for (let i = 0; i < 20; i++) await attempt(`nobody${i}@example.com`, "wrong", "10.9.9.9");
    expect((await attempt(EMAILS.admin, "Trial2026!", "10.9.9.9")).status).toBe(429);
    expect((await attempt(EMAILS.admin, "Trial2026!", "10.9.9.10")).status).toBe(200);
  });

  it("doesn't count successful logins", async () => {
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL + 2; i++) {
      expect((await attempt(EMAILS.maria, "Trial2026!", "10.0.2.1")).status).toBe(200);
    }
  });
});

describe("CSRF on cookie-authenticated requests", () => {
  const post = async (headers: Record<string, string>) =>
    cancel(
      req("/api/shifts/shift-2/cancel", { method: "POST", body: { reason: "no-show" }, headers }),
      ctx({ id: "shift-2" }),
    );

  it("rejects a cross-site state change riding on the cookie", async () => {
    const cookie = `${SESSION_COOKIE}=${await signToken(agencyA)}`;
    expect((await post({ cookie, origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ cookie, "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post({ cookie })).status).toBe(403); // no Origin at all
    expect(await db.shift.findUnique({ where: { id: "shift-2" } })).toMatchObject({ status: "filled" });
  });

  it("allows same-origin cookie requests, Bearer requests, and cookie reads", async () => {
    const token = await signToken(agencyA);
    const cookie = `${SESSION_COOKIE}=${token}`;
    expect((await post({ cookie, origin: "http://localhost" })).status).toBe(200);
    await resetDb();
    expect((await post({ cookie, "sec-fetch-site": "same-origin" })).status).toBe(200);
    await resetDb();
    expect((await post({ ...bearer(token), origin: "https://evil.example" })).status).toBe(200);
    // Reads aren't state changes.
    expect((await listShifts(req("/api/shifts", { headers: { cookie, origin: "https://evil.example" } }))).status).toBe(200);
  });
});

describe("input and upload validation", () => {
  const form = (file: File) => {
    const data = new FormData();
    data.set("file", file);
    data.set("expiresAt", "2027-06-30");
    return data;
  };
  const upload = async (file: File, headers?: Record<string, string>) =>
    uploadCredential(req("/api/credentials", { method: "POST", token: await login("james"), body: form(file), headers }));

  it("rejects a file whose bytes don't match its declared type", async () => {
    const fake = new File(["<script>alert(1)</script>"], "license.pdf", { type: "application/pdf" });
    const res = await upload(fake);
    expect(res.status).toBe(400);
    expect(await res.json()).toStrictEqual({ error: "file: must be a PDF, JPEG or PNG" });
    expect(storage.uploadCredentialFile).not.toHaveBeenCalled();
  });

  it("stores the sniffed type, not the client's claim", async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "scan.pdf", { type: "application/pdf" });
    expect((await upload(png)).status).toBe(201);
    expect(vi.mocked(storage.uploadCredentialFile).mock.calls[0][2]).toBe("image/png");
  });

  it("refuses an oversized body before parsing it", async () => {
    const res = await upload(new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" }), {
      "content-length": String(50 * 1024 * 1024),
    });
    expect(res.status).toBe(413);
    expect(storage.uploadCredentialFile).not.toHaveBeenCalled();
  });

  it("caps login field lengths", async () => {
    const long = (n: number) => "a".repeat(n);
    for (const body of [
      { email: `${long(250)}@example.com`, password: "x" },
      { email: EMAILS.maria, password: long(129) },
    ]) {
      expect((await loginHandler(req("/api/auth/login", { method: "POST", body }))).status).toBe(400);
    }
  });
});

describe("safeNext (open redirect)", () => {
  it.each([
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
  ])("rejects %j", (value) => {
    expect(safeNext(value)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(new File([], "x"))).toBeNull();
  });

  it("keeps same-site paths with their query", () => {
    expect(safeNext("/shifts")).toBe("/shifts");
    expect(safeNext("/admin/audit-log?limit=10")).toBe("/admin/audit-log?limit=10");
    expect(safeNext("/a/../admin")).toBe("/admin");
  });
});
