import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as agencyShifts } from "@/app/api/agencies/[agencyId]/shifts/route";
import { GET as listShifts, POST as createShift } from "@/app/api/shifts/route";
import { db } from "@/lib/db";
import { ctx, latestAudit, login, req, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const shift1 = {
  id: "shift-1",
  agencyId: "agency-a",
  agencyName: "Sunrise Health Staffing",
  role: "RN",
  date: "2026-10-02",
  startTime: "19:00",
  endTime: "07:00",
  status: "open",
  claimedBy: null,
};
const shift2 = {
  id: "shift-2",
  agencyId: "agency-a",
  agencyName: "Sunrise Health Staffing",
  role: "LPN",
  date: "2026-10-03",
  startTime: "07:00",
  endTime: "19:00",
  status: "filled",
  claimedBy: "nurse-1",
};
const shift3 = {
  id: "shift-3",
  agencyId: "agency-b",
  agencyName: "Metro Care Partners",
  role: "RN",
  date: "2026-10-04",
  startTime: "19:00",
  endTime: "07:00",
  status: "open",
  claimedBy: null,
};

describe("GET /api/shifts", () => {
  it("lists every shift in the spec shape, by date then start time", async () => {
    const res = await listShifts(req("/api/shifts", { token: await login("maria") }));
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ shifts: [shift1, shift2, shift3] });
  });

  it("is open to every signed-in role", async () => {
    for (const account of ["agencyB", "admin"] as const) {
      const res = await listShifts(req("/api/shifts", { token: await login(account) }));
      expect(res.status).toBe(200);
    }
  });

  it("returns 401 without a token", async () => {
    const res = await listShifts(req("/api/shifts"));
    expect(res.status).toBe(401);
    expect(await res.json()).toStrictEqual({ error: "Unauthorized" });
  });
});

describe("POST /api/shifts", () => {
  const body = { role: "RN", date: "2026-10-05", startTime: "07:00", endTime: "19:00" };
  const post = async (token: string | undefined, payload: unknown) =>
    createShift(req("/api/shifts", { method: "POST", token, body: payload }));

  it("creates an open shift for the caller's agency (spec example)", async () => {
    const res = await post(await login("agencyA"), body);
    expect(res.status).toBe(201);
    // The spec's example id is shift-7; against the 3-shift seed the sequence gives shift-4.
    expect(await res.json()).toStrictEqual({
      id: "shift-4",
      agencyId: "agency-a",
      agencyName: "Sunrise Health Staffing",
      role: "RN",
      date: "2026-10-05",
      startTime: "07:00",
      endTime: "19:00",
      status: "open",
      claimedBy: null,
    });
    expect(await latestAudit()).toMatchObject({
      action: "shift.created",
      actorId: "agency-a-admin",
      entityId: "shift-4",
    });
  });

  it("ignores an agencyId in the body", async () => {
    const res = await post(await login("agencyB"), { ...body, agencyId: "agency-a" });
    expect(await res.json()).toMatchObject({ agencyId: "agency-b", agencyName: "Metro Care Partners" });
  });

  it("gives concurrent posts distinct ids", async () => {
    const token = await login("agencyA");
    const results = await Promise.all([post(token, body), post(token, body), post(token, body)]);
    const ids = await Promise.all(results.map(async (r) => (await r.json()).id));
    expect(new Set(ids).size).toBe(3);
  });

  it.each([
    [{ ...body, role: "" }],
    [{ ...body, role: "   " }],
    [{ ...body, date: "2026-02-30" }],
    [{ ...body, date: "05/10/2026" }],
    [{ ...body, startTime: "7:00" }],
    [{ ...body, endTime: "24:00" }],
    [{ ...body, endTime: body.startTime }],
    [{ role: "RN" }],
  ])("returns 400 for invalid body %j", async (payload) => {
    const res = await post(await login("agencyA"), payload);
    expect(res.status).toBe(400);
    expect(await res.json()).toStrictEqual({ error: expect.any(String) });
  });

  it("accepts an overnight shift", async () => {
    const res = await post(await login("agencyA"), { ...body, startTime: "19:00", endTime: "07:00" });
    expect(res.status).toBe(201);
  });

  it("returns 403 for nurses and admins, 401 without a token", async () => {
    expect((await post(await login("maria"), body)).status).toBe(403);
    expect((await post(await login("admin"), body)).status).toBe(403);
    expect((await post(undefined, body)).status).toBe(401);
  });
});

describe("GET /api/agencies/:agencyId/shifts", () => {
  const get = async (agencyId: string, token?: string) =>
    agencyShifts(req(`/api/agencies/${agencyId}/shifts`, { token }), ctx({ agencyId }));

  it("agency-a gets shift-1 and shift-2", async () => {
    const res = await get("agency-a", await login("agencyA"));
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ agencyId: "agency-a", shifts: [shift1, shift2] });
  });

  it("agency-b gets shift-3 only", async () => {
    const res = await get("agency-b", await login("agencyB"));
    expect(await res.json()).toStrictEqual({ agencyId: "agency-b", shifts: [shift3] });
  });

  it("returns 403 for another agency and for nurses", async () => {
    const res = await get("agency-b", await login("agencyA"));
    expect(res.status).toBe(403);
    expect(await res.json()).toStrictEqual({ error: "Forbidden" });
    expect((await get("agency-a", await login("maria"))).status).toBe(403);
  });

  it("lets an admin read any agency, and 404s an unknown one", async () => {
    const token = await login("admin");
    expect(await (await get("agency-b", token)).json()).toStrictEqual({ agencyId: "agency-b", shifts: [shift3] });
    const missing = await get("agency-z", token);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toStrictEqual({ error: "Agency not found" });
  });

  it("returns 401 without a token", async () => {
    expect((await get("agency-a")).status).toBe(401);
  });
});
