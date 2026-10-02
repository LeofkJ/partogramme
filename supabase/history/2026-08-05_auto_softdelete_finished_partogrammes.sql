-- Removes manual patient deletion entirely (nurses and doctors could
-- previously soft-delete via the "Supprimer" button on the patient card)
-- and replaces it with an automatic 30-day sweep: a WORK_FINISHED patient
-- that's sat untouched for 30 days gets soft-deleted on its own. Nobody
-- should be able to delete a patient by hand anymore, finished or not.
--
-- Apply manually via the Supabase SQL editor, same as the other files here.

-- 1. New column: when a patient actually became WORK_FINISHED. Nothing
--    existing tracked this — admissionDateTime/workStartDateTime are both
--    about the start of labor, not the end. Set by the app in
--    PartogrammeStore.changeState() alongside the existing refDoctorId
--    attribution on this same transition.
alter table "Partogramme"
  add column "workFinishedDateTime" timestamptz;

-- 2. Hard block on manual deletion: a RESTRICTIVE policy is ANDed with
--    every other UPDATE policy on this table, so no matter what a nurse or
--    doctor's own policy otherwise allows, the resulting row can never have
--    isDeleted = true. This is enforced independently of the app UI (which
--    no longer has a delete button at all) so a direct API call can't do it
--    either. The 30-day cron job below runs as a Postgres role that
--    bypasses RLS entirely, so it's unaffected by this.
create policy "Block manual soft-delete of partogrammes"
  on "Partogramme"
  as restrictive
  for update
  to authenticated
  with check ("isDeleted" = false);

-- 3. The actual 30-day sweep. Daily at 03:00 UTC, soft-deletes any
-- WORK_FINISHED patient whose workFinishedDateTime is more than 30 days
-- old. pg_cron jobs run as the role that scheduled them (postgres), which
-- owns this table and isn't subject to RLS, so this runs regardless of the
-- restrictive policy above.
create extension if not exists pg_cron;

select cron.schedule(
  'soft-delete-finished-partogrammes-30d',
  '0 3 * * *',
  $$
    update "Partogramme"
    set "isDeleted" = true
    where state = 'WORK_FINISHED'
      and "isDeleted" = false
      and "workFinishedDateTime" is not null
      and "workFinishedDateTime" < now() - interval '30 days'
  $$
);
