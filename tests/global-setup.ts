import { PrismaPg } from "@prisma/adapter-pg";
import { seed } from "../prisma/seed";
import { setupTestDb, testDatabaseUrl } from "../scripts/test-db-setup";
import { PrismaClient } from "../src/generated/prisma/client";

// Runs once before the API suite: migrate and seed the dedicated local test database.
export default async function globalSetup() {
  await setupTestDb();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) });
  try {
    await seed(db);
  } finally {
    await db.$disconnect();
  }
}
