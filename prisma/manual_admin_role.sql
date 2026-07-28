-- Run this manually in the Supabase SQL editor against whichever environment
-- needs the admin system. Same rationale as manual_userinfo_phone_address.sql:
-- schema.prisma reflects the end state, this is what actually needs to run.

-- 1. Add ADMIN to the Role enum. A system-wide admin isn't scoped to a
--    hospital and can move nurses/doctors anywhere. LOCAL_ADMIN (hospital-
--    scoped) is a later addition, not part of this pass.
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- 2. hospitalId / refDoctorId were NOT NULL — an ADMIN has neither.
ALTER TABLE "userInfo" ALTER COLUMN "hospitalId" DROP NOT NULL;
ALTER TABLE "userInfo" ALTER COLUMN "refDoctorId" DROP NOT NULL;

-- 3. Tracks whether this account is still on the temp password an admin
--    generated for them. Not a hard gate (see notify/login banner in-app) —
--    just what drives the persistent "change your password" reminder shown
--    on every login until they change it themselves.
ALTER TABLE "userInfo" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- After running this, regenerate the Supabase TypeScript types:
--   npm run update-types        (against the hosted project)
--   npm run update-types-local  (against a local Supabase instance)
