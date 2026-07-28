-- Run this manually in the Supabase SQL editor (or via `psql`) against
-- whichever environment needs profile phone/address support — adds both
-- columns and makes "phone" required, in the correct order for a fresh
-- environment that has neither column yet.
--
-- Not wired into prisma/migrations: that folder's history doesn't track the
-- app's real tables (userInfo, Partogramme, etc. were created directly in
-- Supabase, not through a tracked Prisma migration), so running
-- `prisma migrate dev` against it would try to reconcile a migration chain
-- that doesn't match the live schema. schema.prisma reflects the end state
-- these statements produce; this SQL is what actually needs to run against
-- the database.

-- Add the columns.
ALTER TABLE "userInfo" ADD COLUMN "phone" TEXT;
ALTER TABLE "userInfo" ADD COLUMN "address" TEXT;

-- Backfill any existing rows (phone starts NULL for everyone) so the
-- NOT NULL constraint below can apply.
UPDATE "userInfo" SET "phone" = '' WHERE "phone" IS NULL;

-- Default '' so an insert that doesn't explicitly set a phone (e.g. the
-- initial nurse/doctor onboarding dialog, which doesn't collect one yet)
-- still succeeds instead of erroring outright. The app's Profile screen is
-- what actually enforces a real, non-empty value before letting someone save.
ALTER TABLE "userInfo" ALTER COLUMN "phone" SET DEFAULT '';
ALTER TABLE "userInfo" ALTER COLUMN "phone" SET NOT NULL;

-- After running this, regenerate the Supabase TypeScript types so the app
-- code sees the new columns:
--   npm run update-types        (against the hosted project)
--   npm run update-types-local  (against a local Supabase instance)
