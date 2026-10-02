-- Fix: 2026-08-19_hospital_staff_edit_and_request.sql's vitals INSERT/
-- UPDATE policies (the "hospital_staff" predicate) hardcoded
-- u.role = 'NURSE', despite that file's own header stating hospital
-- doctors and hospital nurses have the same powers, and despite Block 3
-- in that same file already using the correct inclusive predicate for the
-- transfer-request policy. Doctors could read a transferred patient's
-- vitals (see 2026-08-14_hospital_staff_full_visibility_and_admin_scope.sql)
-- but never write one — every INSERT/UPDATE attempt failed with 42501.
--
-- Apply manually via the Supabase SQL editor, after
-- 2026-08-19_hospital_staff_edit_and_request.sql. Idempotent.

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
         and (
           u.role = ''DOCTOR''
           or (u.role = ''NURSE'' and u."nurseType" is distinct from ''MATERNITY'')
         )
     )';
begin
  foreach t in array vitals_tables loop
    -- Drop the old nurse-only policies from 2026-08-19.
    execute format('drop policy if exists %I on %I', 'Hosp nurse insert ' || t, t);
    execute format('drop policy if exists %I on %I', 'Hosp nurse update ' || t, t);

    execute format('drop policy if exists %I on %I', 'Hosp staff insert ' || t, t);
    execute format(
      'create policy %I on %I for insert with check (' || hospital_staff || ')',
      'Hosp staff insert ' || t, t, t
    );

    execute format('drop policy if exists %I on %I', 'Hosp staff update ' || t, t);
    execute format(
      'create policy %I on %I for update using (' || hospital_staff || ') with check (' || hospital_staff || ')',
      'Hosp staff update ' || t, t, t, t
    );
  end loop;
end $$;
