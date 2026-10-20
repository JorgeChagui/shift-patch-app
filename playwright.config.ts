import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl } from "./scripts/test-db";

// A dedicated port and database, so the suite never touches the dev server or dev data.
const port = 3100;
const databaseUrl = e2eDatabaseUrl();

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/e2e/global-setup.ts",
  // Spec files touch disjoint seed shifts, so files run in parallel; tests inside a file
  // run in order. No retries: a retried mutating test would meet the state it already changed.
  fullyParallel: false,
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // A production build: same 'use cache' behaviour as Vercel, and it can run next to
    // `next dev` (Next 16 keeps dev output in .next/dev and locks it per instance).
    command: `npm run build && npm run start -- -p ${port}`,
    url: `http://localhost:${port}/api/health`,
    // Always a fresh server, so its cache starts empty against the freshly seeded DB.
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
      JWT_SECRET: process.env.JWT_SECRET || "e2e-only-jwt-secret-not-for-production",
      SUPABASE_URL: process.env.SUPABASE_URL ?? "",
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? "",
    },
  },
});
