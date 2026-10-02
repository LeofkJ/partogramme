-- Fix: doctors got a 403 "new row violates row-level security policy" trying
-- to delete a WORK_FINISHED patient. Deleting is a soft-delete (UPDATE
-- isDeleted = true, see PartogrammeStore.removePartogramme), and the only
-- doctor UPDATE policy ("Doctors can update transferred partogrammes", see
-- 2026-07-14_fix_partogramme_doctor_update_scope.sql) has `using (... and
-- state = 'TRANSFERRED')` — once a doctor finishes a patient the state
-- becomes WORK_FINISHED, so that USING clause no longer matches and RLS
-- blocks every further update, delete included. Nurses aren't affected:
-- their own-patient policy isn't scoped by state at all.
--
-- Fix widens the USING clause to also match WORK_FINISHED, consistent with
-- this app's existing access model (see 2026-07-30_partogramme_ref_doctor_nullable.sql):
-- any doctor in the hospital can act on any patient there, finished or not.
--
-- Apply manually via the Supabase SQL editor, same as the other files here.

alter policy "Doctors can update transferred partogrammes"
  on "Partogramme"
  using (
    exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'DOCTOR'
        and "userInfo"."hospitalId" = "Partogramme"."hospitalId"
    )
    and state in ('TRANSFERRED', 'WORK_FINISHED')
  )
  with check (
    exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'DOCTOR'
        and "userInfo"."hospitalId" = "Partogramme"."hospitalId"
    )
  );
