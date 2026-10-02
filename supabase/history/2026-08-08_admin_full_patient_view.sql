-- Lets an admin click through from the Dashboard to a patient's full
-- record (Graph.tsx, the same screen nurses/doctors use) and actually see
-- something — that screen loads from 9 tables besides Partogramme/Dilation/
-- BabyHeartFrequency (already covered by 2026-07-29_admin_partogramme_select.sql
-- and 2026-08-06_admin_vitals_select.sql), none of which had any admin
-- read policy. Without this, most of the screen would just render empty.
--
-- Read-only: admin has no UPDATE/INSERT policy on any of these, and
-- Graph.tsx's own edit affordances (onEditPress, editable, etc.) are all
-- gated on canEdit, which is only true for NURSE/DOCTOR — an admin viewing
-- this screen can't act on it, only see it.
--
-- Apply manually via the Supabase SQL editor. Reuses public.is_admin()
-- from 2026-07-27_admin_userinfo_select.sql.

create policy "Admins can view all BabyDescent rows"
  on "BabyDescent"
  for select
  using (public.is_admin());

create policy "Admins can view all amnioticLiquid rows"
  on "amnioticLiquid"
  for select
  using (public.is_admin());

create policy "Admins can view all MotherTemperature rows"
  on "MotherTemperature"
  for select
  using (public.is_admin());

create policy "Admins can view all MotherHeartFrequency rows"
  on "MotherHeartFrequency"
  for select
  using (public.is_admin());

create policy "Admins can view all MotherContractionsFrequency rows"
  on "MotherContractionsFrequency"
  for select
  using (public.is_admin());

create policy "Admins can view all MotherContractionDuration rows"
  on "MotherContractionDuration"
  for select
  using (public.is_admin());

create policy "Admins can view all MotherSystolicBloodPressure rows"
  on "MotherSystolicBloodPressure"
  for select
  using (public.is_admin());

create policy "Admins can view all MotherDiastolicBloodPressure rows"
  on "MotherDiastolicBloodPressure"
  for select
  using (public.is_admin());

create policy "Admins can view all Comment rows"
  on "Comment"
  for select
  using (public.is_admin());
