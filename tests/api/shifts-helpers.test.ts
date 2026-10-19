import { afterAll, describe, expect, it } from "vitest";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { cancellationReasonToApi, credentialTypeToApi } from "@/lib/enums";
import { shiftInclude, toShiftDto } from "@/lib/shifts";
import { shiftEnd, shiftHours } from "@/lib/time";

afterAll(() => db.$disconnect());

describe("toShiftDto", () => {
  it("returns the spec shape for shift-1, keys in spec order", async () => {
    const shift = await db.shift.findUniqueOrThrow({
      where: { id: "shift-1" },
      include: shiftInclude,
    });
    const dto = toShiftDto(shift);

    expect(dto).toStrictEqual({
      id: "shift-1",
      agencyId: "agency-a",
      agencyName: "Sunrise Health Staffing",
      role: "RN",
      date: "2026-10-02",
      startTime: "19:00",
      endTime: "07:00",
      status: "open",
      claimedBy: null,
    });
    expect(Object.keys(dto)).toEqual([
      "id",
      "agencyId",
      "agencyName",
      "role",
      "date",
      "startTime",
      "endTime",
      "status",
      "claimedBy",
    ]);
  });

  it("returns claimedBy for a filled shift", async () => {
    const shift = await db.shift.findUniqueOrThrow({
      where: { id: "shift-2" },
      include: shiftInclude,
    });
    expect(toShiftDto(shift)).toMatchObject({ status: "filled", claimedBy: "nurse-1" });
  });
});

describe("shift time maths", () => {
  it("counts overnight and day shifts as 12 hours", () => {
    expect(shiftHours("19:00", "07:00")).toBe(12);
    expect(shiftHours("07:00", "19:00")).toBe(12);
    expect(shiftHours("22:30", "06:00")).toBe(7.5);
  });

  it("ends overnight shifts the next day", () => {
    expect(shiftEnd("2026-10-02", "19:00", "07:00")).toEqual({ date: "2026-10-03", time: "07:00" });
    expect(shiftEnd("2026-12-31", "19:00", "07:00")).toEqual({ date: "2027-01-01", time: "07:00" });
    expect(shiftEnd("2026-10-03", "07:00", "19:00")).toEqual({ date: "2026-10-03", time: "19:00" });
  });
});

describe("enum mapping", () => {
  it("emits the spec strings for hyphenated values", () => {
    expect(cancellationReasonToApi.noShow).toBe("no-show");
    expect(credentialTypeToApi.tbTest).toBe("tb-test");
  });
});

describe("writeAudit", () => {
  it("writes inside a transaction and rolls back with it", async () => {
    const entityId = `audit-test-${Date.now()}`;

    await db.$transaction(async (tx) => {
      await writeAudit(tx, {
        actorId: "admin-1",
        action: "test.committed",
        entityType: "test",
        entityId,
        metadata: { ok: true },
      });
    });

    await expect(
      db.$transaction(async (tx) => {
        await writeAudit(tx, { actorId: null, action: "test.rolledBack", entityType: "test", entityId });
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");

    const rows = await db.auditLog.findMany({ where: { entityId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorId: "admin-1", action: "test.committed", metadata: { ok: true } });

    await db.auditLog.deleteMany({ where: { entityId } });
  });
});
