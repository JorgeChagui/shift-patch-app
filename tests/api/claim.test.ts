import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as claim } from "@/app/api/shifts/[id]/claim/route";
import { db } from "@/lib/db";
import { ctx, latestAudit, login, req, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const post = async (id: string, token?: string) =>
  claim(req(`/api/shifts/${id}/claim`, { method: "POST", token }), ctx({ id }));

describe("POST /api/shifts/:id/claim", () => {
  it("Maria claims shift-1 (spec example)", async () => {
    const res = await post("shift-1", await login("maria"));
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({
      id: "shift-1",
      agencyId: "agency-a",
      agencyName: "Sunrise Health Staffing",
      role: "RN",
      date: "2026-10-02",
      startTime: "19:00",
      endTime: "07:00",
      status: "filled",
      claimedBy: "nurse-1",
    });
  });

  it("creates the timesheet, notification and audit entry", async () => {
    await post("shift-1", await login("maria"));
    expect(await db.timesheet.findUnique({ where: { shiftId: "shift-1" } })).toMatchObject({
      nurseId: "nurse-1",
      hours: 12,
      status: "pending",
    });
    expect(await db.notification.findFirst({ where: { userId: "nurse-1" } })).toMatchObject({
      kind: "success",
      message: expect.stringContaining("Shift claimed"),
    });
    expect(await latestAudit()).toMatchObject({ action: "shift.claimed", actorId: "nurse-1", entityId: "shift-1" });
  });

  it("blocks James (expired credential) with the exact spec error, and audits it", async () => {
    const res = await post("shift-1", await login("james"));
    expect(res.status).toBe(403);
    expect(await res.json()).toStrictEqual({ error: "Credential expired, cannot claim shift" });
    expect(await db.shift.findUnique({ where: { id: "shift-1" } })).toMatchObject({ status: "open" });
    expect(await latestAudit()).toMatchObject({
      action: "shift.claim_blocked",
      actorId: "nurse-2",
      entityId: "shift-1",
    });
  });

  it("blocks a nurse with no license at all", async () => {
    await db.credential.deleteMany({ where: { nurseId: "nurse-1" } });
    expect((await post("shift-1", await login("maria"))).status).toBe(403);
  });

  it("uses the most recently uploaded license", async () => {
    // A newer upload with an earlier expiry replaces the old one.
    await db.credential.create({
      data: { nurseId: "nurse-1", type: "license", expiresAt: "2026-09-01", uploadedAt: new Date(Date.now() + 1000) },
    });
    expect((await post("shift-1", await login("maria"))).status).toBe(403);
  });

  it("treats a license expiring on the shift date as valid", async () => {
    await db.credential.create({
      data: { nurseId: "nurse-2", type: "license", expiresAt: "2026-10-02", uploadedAt: new Date(Date.now() + 1000) },
    });
    expect((await post("shift-1", await login("james"))).status).toBe(200);
  });

  it("ignores TB tests when checking claims", async () => {
    await db.credential.create({
      data: { nurseId: "nurse-2", type: "tbTest", expiresAt: "2030-01-01", uploadedAt: new Date(Date.now() + 1000) },
    });
    expect((await post("shift-1", await login("james"))).status).toBe(403);
  });

  it("returns 409 for a shift that isn't open", async () => {
    const res = await post("shift-2", await login("maria"));
    expect(res.status).toBe(409);
    expect(await res.json()).toStrictEqual({ error: "Shift is not open" });
  });

  it("lets only one of two simultaneous claims win", async () => {
    const token = await login("maria");
    const statuses = (await Promise.all([post("shift-1", token), post("shift-1", token)])).map((r) => r.status);
    expect(statuses.sort()).toEqual([200, 409]);
    expect(await db.timesheet.count({ where: { shiftId: "shift-1" } })).toBe(1);
  });

  it("returns 404 for an unknown shift", async () => {
    const res = await post("shift-999", await login("maria"));
    expect(res.status).toBe(404);
    expect(await res.json()).toStrictEqual({ error: "Shift not found" });
  });

  it("returns 403 for agencies and admins, 401 without a token", async () => {
    expect((await post("shift-1", await login("agencyA"))).status).toBe(403);
    expect((await post("shift-1", await login("admin"))).status).toBe(403);
    expect((await post("shift-1")).status).toBe(401);
  });
});
