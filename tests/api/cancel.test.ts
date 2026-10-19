import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as cancel } from "@/app/api/shifts/[id]/cancel/route";
import { POST as claim } from "@/app/api/shifts/[id]/claim/route";
import { db } from "@/lib/db";
import { ctx, latestAudit, login, req, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const post = async (id: string, token: string | undefined, body: unknown) =>
  cancel(req(`/api/shifts/${id}/cancel`, { method: "POST", token, body }), ctx({ id }));

describe("POST /api/shifts/:id/cancel", () => {
  it("reopens shift-2 on a no-show (spec example)", async () => {
    const res = await post("shift-2", await login("agencyA"), { reason: "no-show" });
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({
      id: "shift-2",
      agencyId: "agency-a",
      agencyName: "Sunrise Health Staffing",
      role: "LPN",
      date: "2026-10-03",
      startTime: "07:00",
      endTime: "19:00",
      status: "open",
      claimedBy: null,
      cancellation: { reason: "no-show", previousNurseId: "nurse-1" },
    });
  });

  it("records the cancellation, removes the timesheet, notifies the nurse and audits", async () => {
    await post("shift-2", await login("agencyA"), { reason: "no-show" });

    expect(await db.shiftCancellation.findFirst({ where: { shiftId: "shift-2" } })).toMatchObject({
      reason: "noShow",
      previousNurseId: "nurse-1",
      cancelledById: "agency-a-admin",
    });
    expect(await db.timesheet.count({ where: { shiftId: "shift-2" } })).toBe(0);
    expect(await db.notification.findFirst({ where: { userId: "nurse-1" } })).toMatchObject({
      message: expect.stringContaining("Shift cancelled (no-show)"),
    });
    expect(await latestAudit()).toMatchObject({
      action: "shift.cancelled",
      actorId: "agency-a-admin",
      entityId: "shift-2",
      metadata: { reason: "no-show", previousNurseId: "nurse-1" },
    });
  });

  it("lets the shift be claimed again afterwards", async () => {
    await post("shift-2", await login("admin"), { reason: "advance" });
    const res = await claim(req("/api/shifts/shift-2/claim", { method: "POST", token: await login("maria") }), ctx({ id: "shift-2" }));
    expect(res.status).toBe(200);
    expect(await db.timesheet.count({ where: { shiftId: "shift-2" } })).toBe(1);
  });

  it("lets the claiming nurse cancel in advance, but not report a no-show", async () => {
    const token = await login("maria");
    const noShow = await post("shift-2", token, { reason: "no-show" });
    expect(noShow.status).toBe(403);
    expect(await noShow.json()).toStrictEqual({ error: "Nurses can only cancel in advance" });

    const advance = await post("shift-2", token, { reason: "advance" });
    expect(advance.status).toBe(200);
    expect(await advance.json()).toMatchObject({ cancellation: { reason: "advance", previousNurseId: "nurse-1" } });
  });

  it("returns 403 for another nurse or another agency", async () => {
    expect((await post("shift-2", await login("james"), { reason: "advance" })).status).toBe(403);
    const res = await post("shift-2", await login("agencyB"), { reason: "no-show" });
    expect(res.status).toBe(403);
    expect(await res.json()).toStrictEqual({ error: "Forbidden" });
  });

  it("returns 409 for a shift that isn't filled", async () => {
    const res = await post("shift-1", await login("agencyA"), { reason: "advance" });
    expect(res.status).toBe(409);
    expect(await res.json()).toStrictEqual({ error: "Shift is not filled" });
  });

  it("returns 400 for a bad reason, 404 for an unknown shift, 401 without a token", async () => {
    const token = await login("agencyA");
    expect((await post("shift-2", token, { reason: "late" })).status).toBe(400);
    expect((await post("shift-2", token, {})).status).toBe(400);
    expect((await post("shift-999", token, { reason: "advance" })).status).toBe(404);
    expect((await post("shift-2", undefined, { reason: "advance" })).status).toBe(401);
  });
});
