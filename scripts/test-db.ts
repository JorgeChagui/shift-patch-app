// Test database helpers. Plain CommonJS-safe module (no import.meta): Playwright loads it
// from playwright.config.ts. The CLI entry is scripts/test-db-setup.ts.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { Client } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Refuses anything that isn't a dedicated database on a local host. */
function assertSafeTestUrl(name: string, url: string): string {
  const { hostname, pathname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname.replace(/^\[|\]$/g, ""))) {
    throw new Error(`Refusing to use non-local ${name} host "${hostname}"`);
  }
  if (pathname === "/postgres") {
    throw new Error(`${name} must point at a dedicated database, not the dev 'postgres' one`);
  }
  return url;
}

/** Returns TEST_DATABASE_URL (API tests), refusing anything that isn't a local database. */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
  return assertSafeTestUrl("TEST_DATABASE_URL", url);
}

/**
 * Database for the E2E suite: E2E_DATABASE_URL, or TEST_DATABASE_URL with the database
 * renamed to `shiftpatch_e2e`, so API and E2E runs never reset each other's data.
 */
export function e2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return assertSafeTestUrl("E2E_DATABASE_URL", process.env.E2E_DATABASE_URL);
  const url = new URL(testDatabaseUrl());
  url.pathname = "/shiftpatch_e2e";
  return url.toString();
}

/** Creates the test database if needed and applies all migrations to it. */
export async function setupTestDb(url = testDatabaseUrl()) {
  const name = decodeURIComponent(new URL(url).pathname.slice(1));

  const admin = new URL(url);
  admin.pathname = "/postgres";
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (!rowCount) await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  } finally {
    await client.end();
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DIRECT_URL: url },
    stdio: "pipe",
  });
}
