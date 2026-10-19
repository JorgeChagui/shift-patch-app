import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as adminShifts } from "@/app/api/admin/shifts/route";
import { GET as adminStream } from "@/app/api/admin/stream/route";
import { POST as withdraw } from "@/app/api/shifts/[id]/withdraw/route";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { shiftChangesStream } from "@/lib/stream";
import { type Account, ctx, latestAudit, login, req, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("GET /api/admin/shifts", () => {
  it("returns counts by status and every shift with agency and nurse names", async () => {
    const res = await adminShifts(req("/api/admin/shifts", { token: await login("admin") }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.counts).toStrictEqual({ open: 2, filled: 1, cancelled: 0, total: 3 });
    expect(body.shifts.map((s: { id: string }) => s.id)).toEqual(["shift-1", "shift-2", "shift-3"]);
    expect(body.shifts[1]).toStrictEqual({
      id: "shift-2",
      agencyId: "agency-a",
      agencyName: "Sunrise Health Staffing",
      role: "LPN",
      date: "2026-10-03",
      startTime: "07:00",
      endTime: "19:00",
      status: "filled",
      claimedBy: "nurse-1",
      claimedByName: "Maria Lopez",
    });
    expect(body.shifts[0].claimedByName).toBeNull();
  });

  it("is admin only", async () => {
    expect((await adminShifts(req("/api/admin/shifts", { token: await login("agencyA") }))).status).toBe(403);
    expect((await adminShifts(req("/api/admin/shifts"))).status).toBe(401);
  });
});

describe("POST /api/shifts/:id/withdraw", () => {
  const post = async (id: string, account?: Account) =>
    withdraw(req(`/api/shifts/${id}/withdraw`, { method: "POST", token: account && (await login(account)) }), ctx({ id }));

  it("lets the owning agency withdraw an open shift, and audits it", async () => {
    const res = await post("shift-1", "agencyA");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "shift-1", status: "cancelled", claimedBy: null });
    expect(await latestAudit()).toMatchObject({ action: "shift.withdrawn", actorId: "agency-a-admin", entityId: "shift-1" });

    const summary = await (await adminShifts(req("/api/admin/shifts", { token: await login("admin") }))).json();
    expect(summary.counts).toStrictEqual({ open: 1, filled: 1, cancelled: 1, total: 3 });
  });

  it("lets an admin withdraw any agency's shift", async () => {
    expect((await post("shift-3", "admin")).status).toBe(200);
  });

  it("returns 409 for a shift that isn't open", async () => {
    const res = await post("shift-2", "agencyA");
    expect(res.status).toBe(409);
    expect(await res.json()).toStrictEqual({ error: "Only open shifts can be withdrawn" });
  });

  it("returns 403 for another agency or a nurse, 404 for an unknown shift, 401 without a token", async () => {
    expect((await post("shift-3", "agencyA")).status).toBe(403);
    expect((await post("shift-1", "maria")).status).toBe(403);
    expect((await post("shift-999", "admin")).status).toBe(404);
    expect((await post("shift-1")).status).toBe(401);
  });
});

/** Reads SSE chunks until `predicate` matches the accumulated text (or the stream ends). */
async function readUntil(stream: ReadableStream<Uint8Array>, predicate: (text: string) => boolean) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (!predicate(text)) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  await reader.cancel();
  return text;
}

describe("admin stream", () => {
  it("sends shifts-changed when the DB changes, pings otherwise", async () => {
    const stream = shiftChangesStream(db, { pollMs: 50, maxMs: 5000 });
    // Prisma queries are lazy, so the write must be awaited for it to run.
    setTimeout(async () => {
      await writeAudit(db, { actorId: "admin-1", action: "test.change", entityType: "test", entityId: "x" });
    }, 200);
    const text = await readUntil(stream, (t) => t.includes("event: shifts-changed"));
    expect(text).toMatch(/^retry: 50\nevent: ready\n/);
    expect(text).toContain(": ping\n\n");
    expect(text).toContain("event: shifts-changed\ndata: ");
  });

  it("closes itself after maxMs", async () => {
    const text = await readUntil(shiftChangesStream(db, { pollMs: 20, maxMs: 100 }), () => false);
    expect(text).toContain("event: ready");
  });

  it("closes when the client disconnects", async () => {
    const abort = new AbortController();
    const stream = shiftChangesStream(db, { pollMs: 20, maxMs: 60_000, signal: abort.signal });
    setTimeout(() => abort.abort(), 100);
    const text = await readUntil(stream, () => false);
    expect(text).toContain("event: ready");
  });

  it("GET /api/admin/stream is an admin-only event stream", async () => {
    const abort = new AbortController();
    const res = await adminStream(req("/api/admin/stream", { token: await login("admin"), signal: abort.signal }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(await readUntil(res.body!, (t) => t.includes("event: ready"))).toContain("event: ready");
    abort.abort();

    expect((await adminStream(req("/api/admin/stream", { token: await login("maria") }))).status).toBe(403);
    expect((await adminStream(req("/api/admin/stream"))).status).toBe(401);
  });
});
