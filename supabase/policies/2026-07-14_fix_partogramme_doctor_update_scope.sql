-- Fix: "Doctors can update partogrammes from same hospital" only checked hospital
-- membership, not role, so any nurse (once their userInfo row existed) could update
-- ANY other nurse's partogramme in the same hospital, in any state. Discovered via
-- a nurse account (f02381f9-2110-4ba8-8586-4d051bd6d296) attempting to mark another
-- nurse's (Anna Nurse, nurse67@gmail.com) partogramme as WORK_FINISHED.
--
-- Intended access, per the app's own UI logic (src/screens/Graph/Graph.tsx):
--   - A nurse may update only her own partogrammes (unaffected by this fix — see
--     "Allowed access to their data" / "Nurses can update their own partogrammes").
--   - A doctor may update a partogramme in her hospital only once it has been
--     explicitly TRANSFERRED to her, and only if her role is actually DOCTOR.
--
-- Apply manually via the Supabase SQL editor (this repo has no Supabase CLI/migration
-- linkage set up, so this file is tracked here for review/history, not auto-applied).

-- 1. Remove the overly-broad policy.
drop policy "Doctors can update partogrammes from same hospital" on "Partogramme";

-- 2. Tighten the remaining doctor policy to actually require role = 'DOCTOR'
--    (previously it only checked hospital membership, same gap as above, just
--    scoped to TRANSFERRED partogrammes instead of any state).
alter policy "Doctors can update transferred partogrammes"
  on "Partogramme"
  using (
    exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'DOCTOR'
        and "userInfo"."hospitalId" = "Partogramme"."hospitalId"
    )
    and state = 'TRANSFERRED'
  )
  with check (
    exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'DOCTOR'
        and "userInfo"."hospitalId" = "Partogramme"."hospitalId"
    )
  );
