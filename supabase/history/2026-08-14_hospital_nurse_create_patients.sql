-- REVERTED 2026-08-19 — see 2026-08-19_revoke_hospital_nurse_create_patients.sql.
-- The doctor's own email (relayed by Gv) explicitly says "Hospital (doctor
-- or nurse) do not create patient, they only get the one that are
-- transfered to them" — neither role creates patients. Kept this file for
-- history; do not re-run it.
--
-- Live bug found while double-checking task.md's "hospital staff don't
-- create patients" note: querying pg_policies showed the ONLY INSERT
-- policy on "Partogramme" is "Maternity nurses can create patients for
-- their maternity" — hospital nurses have had zero INSERT policy at all,
-- meaning they currently cannot create a patient. User confirmed hospital
-- nurses should still be able to (only doctors shouldn't) — doctors
-- already have no INSERT policy and no UI path to create one, so this
-- just restores the missing hospital-nurse side.
--
-- Scope matches the maternity-nurse INSERT policy's shape: nurseId must be
-- her own, hospitalId must be her own hospital. nurseType uses "is
-- distinct from 'MATERNITY'" rather than an equality check, since
-- existing hospital-nurse accounts have nurseType = NULL, not explicitly
-- 'HOSPITAL' (confirmed live).
--
-- Apply manually via the Supabase SQL editor. Idempotent, safe to re-run.

drop policy if exists "Hospital nurses can create patients for their hospital" on "Partogramme";
create policy "Hospital nurses can create patients for their hospital"
  on "Partogramme"
  for insert
  with check (
    "nurseId" = auth.uid()
    and exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'NURSE'
        and "userInfo"."nurseType" is distinct from 'MATERNITY'
        and "userInfo"."hospitalId" = "Partogramme"."hospitalId"
    )
  );
