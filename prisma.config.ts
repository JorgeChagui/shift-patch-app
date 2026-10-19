import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate, db seed, studio) uses the direct connection (port 5432 on Supabase).
// The app connects through the pooled DATABASE_URL in src/lib/db.ts.
// Read from process.env rather than env() so `prisma generate` works without a database (CI).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
