-- Supabase exposes the public schema through its Data API (PostgREST) to the anon and
-- authenticated roles. ShiftPatch never uses that API: the app connects as the postgres
-- role through Prisma, which bypasses RLS. Enabling RLS with no policies denies all Data
-- API access, so password hashes and other rows can't be read with a publishable key.
ALTER TABLE "agencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_cancellations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timesheets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
-- Prisma's own bookkeeping table (absent in the shadow database).
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

REVOKE ALL ON SEQUENCE "shift_id_seq" FROM anon, authenticated;
