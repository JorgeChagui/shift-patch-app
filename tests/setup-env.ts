import { testDatabaseUrl } from "../scripts/test-db-setup";

// Point the app's db client (src/lib/db.ts) at the test database before anything imports it.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.DIRECT_URL = testDatabaseUrl();
// Tests sign their own tokens; CI has no .env.
process.env.JWT_SECRET ??= "test-only-jwt-secret-not-for-production";
