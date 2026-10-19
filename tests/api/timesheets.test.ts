import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as claim } from "@/app/api/shifts/[id]/claim/route";
import { POST as approve } from "@/app/api/timesheets/[id]/approve/route";
import { GET as listTimesheets } from "@/app/api/timesheets/route";
import { db } from "@/lib/db";
import { type Account, ctx, latestAudit, login, req, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const list = async (account?: Account) =>
  listTimesheets(req("/api/timesheets", { token: account && (await login(account)) }));
const shift2Timesheet = () => db.timesheet.findUniqueOrThrow({ where: { shiftId: "shift-2" } });
const approveAs = async (id: string, account?: Account) =>
  approve(
    req(`/api/timesheets/${id}/approve`, { method: "POST", token: account && (await login(account)) }),
    ctx({ id }),
  );

describe("GET /api/timesheets", () => {
  it("returns shift details, nurse name, hours and status", async () => {
    const { timesheets } = await (await list("admin")).json();
    expect(timesheets).toStrictEqual([
      {
        id: expect.any(String),
        shiftId: "shift-2",
        shift: expect.objectContaining({ id: "shift-2", role: "LPN", date: "2026-10-03" }),
        nurseId: "nurse-1",
        nurseName: "Maria Lopez",
        hours: 12,
        status: "pending",
        approvedAt: null,
      },
    ]);
  });

  it("scopes by role", async () => {
    // Give agency-b a filled shift too.
    await db.credential.create({ data: { nurseId: "nurse-2", type: "license", expiresAt: "2030-01-01", uploadedAt: new Date(Date.now() + 1000) } });
    await claim(req("/api/shifts/shift-3/claim", { method: "POST", token: await login("james") }), ctx({ id: "shift-3" }));

    const ids = async (account: Account) =>
      ((await (await list(account)).json()).timesheets as { shiftId: string }[]).map((t) => t.shiftId);
    expect(await ids("maria")).toEqual(["shift-2"]);
    expect(await ids("james")).toEqual(["shift-3"]);
    expect(await ids("agencyA")).toEqual(["shift-2"]);
    expect(await ids("agencyB")).toEqual(["shift-3"]);
    expect(await ids("admin")).toEqual(["shift-2", "shift-3"]);
  });

  it("returns 401 without a token", async () => {
    expect((await list()).status).toBe(401);
  });
});

describe("POST /api/timesheets/:id/approve", () => {
  it("lets the owning agency approve, and audits it", async () => {
    const { id } = await shift2Timesheet();
    const res = await approveAs(id, "agencyA");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id, status: "approved", approvedAt: expect.any(String) });
    expect(await shift2Timesheet()).toMatchObject({ status: "approved", approvedById: "agency-a-admin" });
    expect(await latestAudit()).toMatchObject({ action: "timesheet.approved", actorId: "agency-a-admin", entityId: id });
  });

  it("lets an admin approve, and returns 409 the second time", async () => {
    const { id } = await shift2Timesheet();
    expect((await approveAs(id, "admin")).status).toBe(200);
    const again = await approveAs(id, "admin");
    expect(again.status).toBe(409);
    expect(await again.json()).toStrictEqual({ error: "Timesheet is already approved" });
  });

  it("returns 403 for another agency or a nurse, 404 for an unknown id, 401 without a token", async () => {
    const { id } = await shift2Timesheet();
    expect((await approveAs(id, "agencyB")).status).toBe(403);
    expect((await approveAs(id, "maria")).status).toBe(403);
    expect((await approveAs("nope", "admin")).status).toBe(404);
    expect((await approveAs(id)).status).toBe(401);
  });
});
