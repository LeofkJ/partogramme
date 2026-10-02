-- Lets a doctor claim a patient directly (new "RÉCLAMER" button in
-- Graph.tsx) instead of only being able to act once a nurse has already
-- pushed a TRANSFERRED handoff. The existing "Doctors can update transferred
-- partogrammes" policy (from 2026-07-14_fix_partogramme_doctor_update_scope.sql)
-- only matches state = 'TRANSFERRED', so claiming from ADMITTED/IN_PROGRESS
-- needs its own policy — added alongside, not replacing, the existing one.
--
-- Scope is deliberately narrow: this only covers moving a still-active
-- (ADMITTED/IN_PROGRESS) partogramme to TRANSFERRED. It does not let a
-- doctor set any other state from here — WORK_FINISHED still requires the
-- separate policy that's gated on state = 'TRANSFERRED'.
--
-- Apply manually via the Supabase SQL editor (same as the other files in
-- this folder).

create policy "Doctors can claim active partogrammes"
  on "Partogramme"
  for update
  using (
    exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'DOCTOR'
        and "userInfo"."hospitalId" = "Partogramme"."hospitalId"
    )
    and state in ('ADMITTED', 'IN_PROGRESS')
  )
  with check (
    exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'DOCTOR'
        and "userInfo"."hospitalId" = "Partogramme"."hospitalId"
    )
    and state = 'TRANSFERRED'
  );
