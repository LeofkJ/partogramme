-- Reverses two decisions from task.md's review pass:
--
-- 1. Hospital staff (every doctor AND nurse at a hospital, not just
--    doctors) should see ALL patients associated with that hospital via a
--    linked maternity — both still in labour at the maternity (not yet
--    transferred) and already transferred, not just alert-flagged ones.
--    Previously this was doctor-only and alert-fields-only (computed
--    client-side by maternityAlertStore); now it's full row/column access
--    for both roles, same as any other hospital-scoped patient.
--
-- 2. Admin is purely account/hospital/maternity management — no clinical
--    data access at all. Partogram/dashboard access is a separate
--    permission from being an admin. This drops every "Admins can view
--    all X rows" policy added across 2026-07-29/2026-08-06/2026-08-08, and
--    removes the is_admin() branch from the restrictive Partogramme
--    policy. Admin's hospital/maternity/user-management policies
--    (hospital insert/update, userInfo select, maternity insert/update,
--    hospitalMaternityLink insert/delete) are untouched — those aren't
--    clinical data.
--
-- Apply manually via the Supabase SQL editor. Idempotent, safe to re-run.

-- ============================================================
-- 1. Drop admin's clinical-data SELECT policies.
-- ============================================================

drop policy if exists "Admins can view all Partogramme rows" on "Partogramme";
drop policy if exists "Admins can view all Dilation rows" on "Dilation";
drop policy if exists "Admins can view all BabyHeartFrequency rows" on "BabyHeartFrequency";
drop policy if exists "Admins can view all BabyDescent rows" on "BabyDescent";
drop policy if exists "Admins can view all amnioticLiquid rows" on "amnioticLiquid";
drop policy if exists "Admins can view all MotherTemperature rows" on "MotherTemperature";
drop policy if exists "Admins can view all MotherHeartFrequency rows" on "MotherHeartFrequency";
drop policy if exists "Admins can view all MotherContractionsFrequency rows" on "MotherContractionsFrequency";
drop policy if exists "Admins can view all MotherContractionDuration rows" on "MotherContractionDuration";
drop policy if exists "Admins can view all MotherSystolicBloodPressure rows" on "MotherSystolicBloodPressure";
drop policy if exists "Admins can view all MotherDiastolicBloodPressure rows" on "MotherDiastolicBloodPressure";
drop policy if exists "Admins can view all Comment rows" on "Comment";

-- ============================================================
-- 2. Rewrite the restrictive Partogramme policy: drop the is_admin()
--    branch, widen the linked-maternity branch from doctor-only to
--    doctor-or-nurse. Same restrictive policy that's needed a new branch
--    3 times before (maternity nurses, admins, doctors) — this both
--    removes a branch and widens another.
-- ============================================================

drop policy if exists "Users can only fetch data from the same hospital" on "Partogramme";
create policy "Users can only fetch data from the same hospital"
  on "Partogramme"
  as restrictive
  for select
  using (
    "hospitalId" in (
      select "userInfo"."hospitalId" from "userInfo" where auth.uid() = "userInfo"."profileId"
    )
    or exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'NURSE'
        and "userInfo"."nurseType" = 'MATERNITY'
        and "userInfo"."maternityId" = "Partogramme"."maternityId"
    )
    or exists (
      select 1 from "userInfo" u
      join "hospitalMaternityLink" hml on hml."hospitalId" = u."hospitalId"
      where u."profileId" = auth.uid()
        and u.role in ('DOCTOR', 'NURSE')
        and hml."maternityId" = "Partogramme"."maternityId"
    )
  );

-- ============================================================
-- 3. Widen the permissive linked-maternity policies (Partogramme,
--    Dilation, BabyHeartFrequency) from doctor-only to doctor-or-nurse.
-- ============================================================

drop policy if exists "Doctors can view alerts from linked maternities" on "Partogramme";
create policy "Hospital staff can view patients from linked maternities"
  on "Partogramme"
  for select
  using (
    exists (
      select 1 from "userInfo" u
      join "hospitalMaternityLink" hml on hml."hospitalId" = u."hospitalId"
      where u."profileId" = auth.uid()
        and u.role in ('DOCTOR', 'NURSE')
        and hml."maternityId" = "Partogramme"."maternityId"
    )
  );

drop policy if exists "Doctors can view Dilation from linked maternities" on "Dilation";
create policy "Hospital staff can view Dilation from linked maternities"
  on "Dilation"
  for select
  using (
    "partogrammeId" in (
      select p.id from "Partogramme" p
      join "hospitalMaternityLink" hml on hml."maternityId" = p."maternityId"
      join "userInfo" u on u."hospitalId" = hml."hospitalId"
      where u."profileId" = auth.uid()
        and u.role in ('DOCTOR', 'NURSE')
    )
  );

drop policy if exists "Doctors can view BabyHeartFrequency from linked maternities" on "BabyHeartFrequency";
create policy "Hospital staff can view BabyHeartFrequency from linked maternities"
  on "BabyHeartFrequency"
  for select
  using (
    "partogrammeId" in (
      select p.id from "Partogramme" p
      join "hospitalMaternityLink" hml on hml."maternityId" = p."maternityId"
      join "userInfo" u on u."hospitalId" = hml."hospitalId"
      where u."profileId" = auth.uid()
        and u.role in ('DOCTOR', 'NURSE')
    )
  );

-- ============================================================
-- 4. Add linked-maternity SELECT for the remaining 9 vitals tables —
--    these never had a linked-maternity policy at all (only Dilation and
--    BabyHeartFrequency were needed for the old alert-only computation).
--    Hospital staff now need the full chart, so all 11 tables need this.
-- ============================================================

do $$
declare
  vitals_tables text[] := array[
    'BabyDescent', 'amnioticLiquid', 'MotherSystolicBloodPressure',
    'MotherDiastolicBloodPressure', 'MotherContractionsFrequency',
    'MotherHeartFrequency', 'MotherTemperature', 'MotherContractionDuration', 'Comment'
  ];
  t text;
begin
  foreach t in array vitals_tables loop
    execute format(
      'drop policy if exists %I on %I',
      'Hospital staff can view ' || t || ' from linked maternities', t
    );
    execute format(
      'create policy %I on %I for select using (
         exists (
           select 1 from "Partogramme" p
           join "hospitalMaternityLink" hml on hml."maternityId" = p."maternityId"
           join "userInfo" u on u."hospitalId" = hml."hospitalId"
           where p.id = %I."partogrammeId"
             and u."profileId" = auth.uid()
             and u.role in (''DOCTOR'', ''NURSE'')
         )
       )',
      'Hospital staff can view ' || t || ' from linked maternities', t, t
    );
  end loop;
end $$;
