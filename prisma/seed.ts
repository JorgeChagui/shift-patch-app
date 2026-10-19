import { pathToFileURL } from "node:url";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "../src/generated/prisma/client";
import { shiftHours } from "../src/lib/time";
import {
  LAST_SEEDED_SHIFT_NUMBER,
  SEED_PASSWORD,
  agencies,
  credentials,
  shifts,
  users,
} from "./seed-data";

// Every table, so truncating gives a clean slate. Keep in sync with prisma/schema.prisma.
const TABLES = [
  "notifications",
  "timesheets",
  "audit_logs",
  "shift_cancellations",
  "credentials",
  "shifts",
  "users",
  "agencies",
];

/** Wipes all data and loads the spec sample data. Running it twice gives the same state. */
export async function seed(client: PrismaClient) {
  const passwordHashes = await Promise.all(
    users.map(() => bcrypt.hash(SEED_PASSWORD, 10)),
  );

  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`,
    );

    await tx.agency.createMany({ data: [...agencies] });
    await tx.user.createMany({
      data: users.map((user, i) => ({ ...user, passwordHash: passwordHashes[i] })),
    });
    await tx.credential.createMany({ data: [...credentials] });
    await tx.shift.createMany({ data: [...shifts] });

    for (const shift of shifts) {
      if (shift.status !== "filled" || !shift.claimedById) continue;
      await tx.timesheet.create({
        data: {
          shiftId: shift.id,
          nurseId: shift.claimedById,
          hours: shiftHours(shift.startTime, shift.endTime),
          status: "pending",
        },
      });
    }

    // Next nextval() returns LAST_SEEDED_SHIFT_NUMBER + 1.
    await tx.$executeRaw`SELECT setval('shift_id_seq', ${LAST_SEEDED_SHIFT_NUMBER})`;
  });
}

async function main() {
  const { db } = await import("../src/lib/db");
  try {
    await seed(db);
    console.log("Seeded ShiftPatch sample data.");
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
