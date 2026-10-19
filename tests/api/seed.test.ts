import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seed } from "../../prisma/seed";
import { db } from "@/lib/db";
import { nextShiftId } from "@/lib/shifts";

beforeAll(() => seed(db));
afterAll(async () => {
  await seed(db); // leave the test DB in its seeded state for other files
  await db.$disconnect();
});

describe("seed", () => {
  it("loads exactly the spec agencies", async () => {
    expect(await db.agency.findMany({ orderBy: { id: "asc" } })).toEqual([
      { id: "agency-a", name: "Sunrise Health Staffing" },
      { id: "agency-b", name: "Metro Care Partners" },
    ]);
  });

  it("loads exactly the spec users with the shared password", async () => {
    const users = await db.user.findMany({ orderBy: { id: "asc" } });
    expect(users.map(({ id, name, email, role, agencyId }) => ({ id, name, email, role, agencyId }))).toEqual([
      { id: "admin-1", name: "Alex Kim", email: "alex.kim@example.com", role: "admin", agencyId: null },
      { id: "agency-a-admin", name: "Sunrise Health Staffing", email: "admin@sunrisehealth.example", role: "agency", agencyId: "agency-a" },
      { id: "agency-b-admin", name: "Metro Care Partners", email: "admin@metrocare.example", role: "agency", agencyId: "agency-b" },
      { id: "nurse-1", name: "Maria Lopez", email: "maria.lopez@example.com", role: "nurse", agencyId: null },
      { id: "nurse-2", name: "James Cook", email: "james.cook@example.com", role: "nurse", agencyId: null },
    ]);
    for (const user of users) {
      expect(await bcrypt.compare("Trial2026!", user.passwordHash)).toBe(true);
    }
  });

  it("loads the nurse license credentials", async () => {
    const credentials = await db.credential.findMany({ orderBy: { nurseId: "asc" } });
    expect(credentials.map(({ nurseId, type, expiresAt }) => ({ nurseId, type, expiresAt }))).toEqual([
      { nurseId: "nurse-1", type: "license", expiresAt: "2027-01-01" },
      { nurseId: "nurse-2", type: "license", expiresAt: "2026-06-01" },
    ]);
  });

  it("loads exactly the spec shifts", async () => {
    const shifts = await db.shift.findMany({ orderBy: { id: "asc" } });
    expect(
      shifts.map(({ id, agencyId, role, date, startTime, endTime, status, claimedById }) => ({
        id, agencyId, role, date, startTime, endTime, status, claimedById,
      })),
    ).toEqual([
      { id: "shift-1", agencyId: "agency-a", role: "RN", date: "2026-10-02", startTime: "19:00", endTime: "07:00", status: "open", claimedById: null },
      { id: "shift-2", agencyId: "agency-a", role: "LPN", date: "2026-10-03", startTime: "07:00", endTime: "19:00", status: "filled", claimedById: "nurse-1" },
      { id: "shift-3", agencyId: "agency-b", role: "RN", date: "2026-10-04", startTime: "19:00", endTime: "07:00", status: "open", claimedById: null },
    ]);
  });

  it("creates a pending 12h timesheet for shift-2", async () => {
    const timesheets = await db.timesheet.findMany();
    expect(timesheets).toHaveLength(1);
    expect(timesheets[0]).toMatchObject({ shiftId: "shift-2", nurseId: "nurse-1", hours: 12, status: "pending" });
  });

  it("starts the shift ID sequence after the seeded shifts", async () => {
    expect(await nextShiftId(db)).toBe("shift-4");
  });

  it("is idempotent", async () => {
    await db.notification.create({ data: { userId: "nurse-1", message: "stray" } });
    await seed(db);
    await seed(db);

    const counts = await Promise.all([
      db.agency.count(),
      db.user.count(),
      db.credential.count(),
      db.shift.count(),
      db.timesheet.count(),
      db.notification.count(),
      db.auditLog.count(),
    ]);
    expect(counts).toEqual([2, 5, 2, 3, 1, 0, 0]);
    expect(await nextShiftId(db)).toBe("shift-4");
  });
});
