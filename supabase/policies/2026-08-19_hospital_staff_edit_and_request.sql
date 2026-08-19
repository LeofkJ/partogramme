-- Hospital doctor and hospital nurse have the same powers (Gv, 2026-08-19):
-- see every patient associated to the hospital, read-only until transferred
-- (a transfer can be requested), edit once transferred. Maternity nurses
-- are unchanged.
--
-- Apply manually via the Supabase SQL editor after
-- 2026-08-13_doctor_maternity_alerts_and_requests.sql. Idempotent.

-- ============================================================
-- 1. Hospital nurses can UPDATE a patient once she is at their hospital
--    (TRANSFERRED / WORK_FINISHED) — same scope as
--    "Doctors can update transferred partogrammes". Without this, the
--    chart's canEdit gate is a no-op: TERMINÉ and any partogramme-row
--    write 403 because nurseId is still the midwife.
-- ============================================================

drop policy if exists "Hospital nurses can update transferred partogrammes" on "Partogramme";
create policy "Hospital nurses can update transferred partogrammes"
  on "Partogramme"
  for update
  using (
    exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'NURSE'
        and "userInfo"."nurseType" is distinct from 'MATERNITY'
        and "userInfo"."hospitalId" = "Partogramme"."hospitalId"
    )
    and state in ('TRANSFERRED', 'WORK_FINISHED')
  )
  with check (
    exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'NURSE'
        and "userInfo"."nurseType" is distinct from 'MATERNITY'
        and "userInfo"."hospitalId" = "Partogramme"."hospitalId"
    )
  );

-- ============================================================
-- 2. Same for vitals: hospital nurses can add/edit readings on a
--    transferred patient at their hospital. Maternity-nurse vitals
--    policies key off nurseId = auth.uid(); after transfer that is
--    still the midwife, so hospital nurses never matched.
-- ============================================================

do $$
declare
  vitals_tables text[] := array[
    'BabyHeartFrequency', 'Dilation', 'BabyDescent', 'amnioticLiquid',
    'MotherSystolicBloodPressure', 'MotherDiastolicBloodPressure',
    'MotherContractionsFrequency', 'MotherHeartFrequency',
    'MotherTemperature', 'MotherContractionDuration', 'Comment'
  ];
  t text;
  hospital_staff text :=
    'exists (
       select 1 from "Partogramme" p
       join "userInfo" u on u."profileId" = auth.uid()
       where p.id = %I."partogrammeId"
         and p."hospitalId" = u."hospitalId"
         and p.state in (''TRANSFERRED'', ''WORK_FINISHED'')
         and u.role = ''NURSE''
         and u."nurseType" is distinct from ''MATERNITY''
     )';
begin
  foreach t in array vitals_tables loop
    execute format(
      'drop policy if exists %I on %I',
      'Hosp nurse insert ' || t, t
    );
    execute format(
      'create policy %I on %I for insert with check (' || hospital_staff || ')',
      'Hosp nurse insert ' || t, t, t
    );

    execute format(
      'drop policy if exists %I on %I',
      'Hosp nurse update ' || t, t
    );
    execute format(
      'create policy %I on %I for update using (' || hospital_staff || ') with check (' || hospital_staff || ')',
      'Hosp nurse update ' || t, t, t, t
    );
  end loop;
end $$;

-- ============================================================
-- 3. Transfer request: was doctor-only. Hospital nurses use the same
--    Demander action on the dashboard and chart. Still cannot claim:
--    with check keeps hospitalId null and state ADMITTED/IN_PROGRESS.
-- ============================================================

drop policy if exists "Doctors can request a transfer from linked maternities" on "Partogramme";
drop policy if exists "Hospital staff can request a transfer from linked maternities" on "Partogramme";
create policy "Hospital staff can request a transfer from linked maternities"
  on "Partogramme"
  for update
  using (
    exists (
      select 1 from "userInfo" u
      join "hospitalMaternityLink" hml on hml."hospitalId" = u."hospitalId"
      where u."profileId" = auth.uid()
        and (
          u.role = 'DOCTOR'
          or (u.role = 'NURSE' and u."nurseType" is distinct from 'MATERNITY')
        )
        and hml."maternityId" = "Partogramme"."maternityId"
    )
    and state in ('ADMITTED', 'IN_PROGRESS')
    and "hospitalId" is null
  )
  with check (
    "hospitalId" is null
    and state in ('ADMITTED', 'IN_PROGRESS')
  );
