-- Hospital staff can close (soft-delete) manual alerts once the patient
-- is actually at their hospital — transferred or claimed (Partogramme.hospitalId
-- is set on accept/transfer, see partogrammeStore.acceptTransferRequest /
-- transferToHospital). Midwives keep the existing raise/delete policy for
-- patients still at the maternity; this only adds a hospital-side close
-- after the patient has left.
--
-- Apply manually via the Supabase SQL editor, after 2026-08-19_manual_alert.sql.
-- Idempotent, safe to re-run.

drop policy if exists "Hospital staff can clear alerts for their patients" on "ManualAlert";
create policy "Hospital staff can clear alerts for their patients"
  on "ManualAlert"
  for update
  using (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and p."hospitalId" is not null
        and u."hospitalId" = p."hospitalId"
        and (
          u.role = 'DOCTOR'
          or (u.role = 'NURSE' and u."nurseType" is distinct from 'MATERNITY')
        )
    )
  )
  with check (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and p."hospitalId" is not null
        and u."hospitalId" = p."hospitalId"
        and (
          u.role = 'DOCTOR'
          or (u.role = 'NURSE' and u."nurseType" is distinct from 'MATERNITY')
        )
    )
  );
