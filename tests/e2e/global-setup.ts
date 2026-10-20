import { execFileSync } from "node:child_process";
import { e2eDatabaseUrl, setupTestDb } from "../../scripts/test-db";

// Runs once before the E2E suite: migrate and seed the dedicated E2E database. The app's
// 'use cache' reads can't see a reseed made behind its back, so the suite seeds once and
// Playwright starts a fresh server per run (see playwright.config.ts).
export default async function globalSetup() {
  const url = e2eDatabaseUrl();
  await setupTestDb(url);
  // prisma/seed.ts is an ES module (import.meta); run it with tsx rather than importing it here.
  execFileSync("npx", ["tsx", "prisma/seed.ts"], {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: "pipe",
  });
}
