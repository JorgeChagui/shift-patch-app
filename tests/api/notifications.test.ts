import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as markRead } from "@/app/api/notifications/[id]/read/route";
import { GET as listNotifications } from "@/app/api/notifications/route";
import { POST as cancel } from "@/app/api/shifts/[id]/cancel/route";
import { db } from "@/lib/db";
import { type Account, ctx, latestAudit, login, req, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const list = async (account?: Account) =>
  listNotifications(req("/api/notifications", { token: account && (await login(account)) }));
const read = async (id: string, account?: Account) =>
  markRead(req(`/api/notifications/${id}/read`, { method: "POST", token: account && (await login(account)) }), ctx({ id }));

describe("notifications", () => {
  it("shows the previous nurse the cancellation notice", async () => {
    await cancel(
      req("/api/shifts/shift-2/cancel", { method: "POST", token: await login("agencyA"), body: { reason: "no-show" } }),
      ctx({ id: "shift-2" }),
    );
    const res = await list("maria");
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({
      notifications: [
        {
          id: expect.any(String),
          message: "Shift cancelled (no-show): LPN on 2026-10-03, 07:00-19:00",
          kind: "info",
          readAt: null,
          createdAt: expect.any(String),
        },
      ],
    });
    expect((await (await list("james")).json()).notifications).toEqual([]);
  });

  it("lists unread first, then newest first", async () => {
    const old = await db.notification.create({ data: { userId: "nurse-1", message: "old", readAt: new Date() } });
    await db.notification.create({ data: { userId: "nurse-1", message: "a" } });
    await db.notification.create({ data: { userId: "nurse-1", message: "b" } });
    const { notifications } = await (await list("maria")).json();
    expect(notifications.map((n: { message: string }) => n.message)).toEqual(["b", "a", "old"]);
    expect(notifications[2].id).toBe(old.id);
  });

  it("marks the caller's own notification read, and audits it once", async () => {
    const n = await db.notification.create({ data: { userId: "nurse-1", message: "hi" } });
    const res = await read(n.id, "maria");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toStrictEqual({ id: n.id, readAt: expect.any(String) });
    expect(await latestAudit()).toMatchObject({ action: "notification.read", actorId: "nurse-1", entityId: n.id });

    const again = await read(n.id, "maria");
    expect(await again.json()).toStrictEqual(body);
    expect(await db.auditLog.count({ where: { action: "notification.read" } })).toBe(1);
  });

  it("returns 404 for someone else's notification, 401 without a token", async () => {
    const n = await db.notification.create({ data: { userId: "nurse-1", message: "hi" } });
    expect((await read(n.id, "james")).status).toBe(404);
    expect((await read(n.id)).status).toBe(401);
    expect((await list()).status).toBe(401);
  });
});
