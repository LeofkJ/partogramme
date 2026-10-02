-- Alert responsibility should follow whoever currently has the patient:
-- her own maternity nurse while she's still at the maternity (hospitalId
-- null), the hospital's staff once she's transferred (hospitalId set) —
-- not both at once, and not neither. Two gaps against that model:
--
--   1. Maternity nurses could add/remove alerts on a patient even AFTER
--      she'd been transferred to a hospital (2026-08-19_manual_alert.sql's
--      insert/update policies never checked hospitalId).
--   2. Hospital staff could only CLEAR alerts
--      (2026-08-19_hospital_staff_clear_manual_alerts.sql), never CREATE
--      one — no insert policy existed for them at all.
--
-- Viewing (select) is untouched — both sides can still see alert history
-- regardless of current location, same as before.
--
-- Apply manually via the Supabase SQL editor, after
-- 2026-08-19_manual_alert.sql and
-- 2026-08-19_hospital_staff_clear_manual_alerts.sql. Idempotent, safe to
-- re-run.

-- 1. Maternity nurses: add/remove only while she's still theirs.
drop policy if exists "Maternity nurses can create alerts at their maternity" on "ManualAlert";
create policy "Maternity nurses can create alerts at their maternity"
  on "ManualAlert"
  for insert
  with check (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and p."hospitalId" is null
        and u.role = 'NURSE'
        and u."nurseType" = 'MATERNITY'
        and u."maternityId" = p."maternityId"
    )
  );

drop policy if exists "Maternity nurses can delete alerts at their maternity" on "ManualAlert";
create policy "Maternity nurses can delete alerts at their maternity"
  on "ManualAlert"
  for update
  using (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and p."hospitalId" is null
        and u.role = 'NURSE'
        and u."nurseType" = 'MATERNITY'
        and u."maternityId" = p."maternityId"
    )
  )
  with check (
    exists (
      select 1 from "Partogramme" p
      join "userInfo" u on u."profileId" = auth.uid()
      where p.id = "ManualAlert"."partogrammeId"
        and p."hospitalId" is null
        and u.role = 'NURSE'
        and u."nurseType" = 'MATERNITY'
        and u."maternityId" = p."maternityId"
    )
  );

-- 2. Hospital staff: can now also create, once she's theirs — mirrors
--    2026-08-19_hospital_staff_clear_manual_alerts.sql's existing clear
--    policy exactly.
drop policy if exists "Hospital staff can create alerts for their patients" on "ManualAlert";
create policy "Hospital staff can create alerts for their patients"
  on "ManualAlert"
  for insert
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
