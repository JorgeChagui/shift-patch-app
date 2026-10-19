import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as auditLog } from "@/app/api/audit-log/route";
import { POST as claim } from "@/app/api/shifts/[id]/claim/route";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ctx, login, req, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const get = async (query = "", token?: string) => auditLog(req(`/api/audit-log${query}`, { token }));

describe("GET /api/audit-log", () => {
  it("returns the newest entry first, with the actor's name", async () => {
    const admin = await login("admin"); // logging in is audited too, so do it first
    await claim(req("/api/shifts/shift-1/claim", { method: "POST", token: await login("maria") }), ctx({ id: "shift-1" }));
    const res = await get("", admin);
    expect(res.status).toBe(200);
    const { entries } = await res.json();
    expect(entries[0]).toStrictEqual({
      id: expect.any(String),
      action: "shift.claimed",
      actorId: "nurse-1",
      actorName: "Maria Lopez",
      entityType: "shift",
      entityId: "shift-1",
      metadata: {},
      createdAt: expect.any(String),
    });
  });

  it("pages with limit and cursor", async () => {
    for (let i = 0; i < 5; i++) {
      await writeAudit(db, { actorId: "admin-1", action: `test.${i}`, entityType: "test", entityId: `${i}` });
    }
    const token = await login("admin");
    const first = await (await get("?limit=3", token)).json();
    expect(first.entries.map((e: { action: string }) => e.action)).toEqual(["test.4", "test.3", "test.2"]);
    expect(first.nextCursor).toBe(first.entries[2].id);

    const second = await (await get(`?limit=3&cursor=${first.nextCursor}`, token)).json();
    expect(second.entries.map((e: { action: string }) => e.action)).toEqual(["test.1", "test.0"]);
    expect(second.nextCursor).toBeNull();
  });

  it("returns 400 for an invalid limit", async () => {
    const token = await login("admin");
    expect((await get("?limit=0", token)).status).toBe(400);
    expect((await get("?limit=abc", token)).status).toBe(400);
    expect((await get("?limit=1000", token)).status).toBe(400);
  });

  it("is admin only", async () => {
    expect((await get("", await login("maria"))).status).toBe(403);
    expect((await get("", await login("agencyA"))).status).toBe(403);
    expect((await get("")).status).toBe(401);
  });
});
