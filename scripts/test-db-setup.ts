import "dotenv/config";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { Client } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Returns TEST_DATABASE_URL, refusing anything that isn't a local database. */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
  const { hostname, pathname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname.replace(/^\[|\]$/g, ""))) {
    throw new Error(`Refusing to use non-local test database host "${hostname}"`);
  }
  if (pathname === "/postgres") {
    throw new Error("TEST_DATABASE_URL must point at a dedicated database, not the dev 'postgres' one");
  }
  return url;
}

/** Creates the test database if needed and applies all migrations to it. */
export async function setupTestDb() {
  const url = testDatabaseUrl();
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  setupTestDb()
    .then(() => console.log("Test database is ready."))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
