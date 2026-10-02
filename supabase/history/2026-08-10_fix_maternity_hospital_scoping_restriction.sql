-- Fixes maternity nurses seeing zero patients: a pre-existing RESTRICTIVE
-- policy predating the maternity feature, "Users can only fetch data from
-- the same hospital", is ANDed with every permissive SELECT policy on
-- Partogramme — including the new "Maternity nurses can view their own
-- maternity patients" one from 2026-08-09. Its condition checks
-- "hospitalId" IN (your own hospitalId) — for a maternity nurse both sides
-- are NULL, and `NULL IN (NULL)` is NULL, never true in SQL, so it silently
-- blocked every maternity-created patient for every maternity nurse.
--
-- Widens the restrictive check with an OR branch for the maternity case,
-- mirroring the existing maternity SELECT policy's own condition exactly.
-- Hospital nurses/doctors/admins are entirely unaffected — the added
-- branch is only ever true for a maternity nurse viewing her own
-- maternity's patients.
--
-- Apply manually via the Supabase SQL editor, same as every other file
-- here.

alter policy "Users can only fetch data from the same hospital"
  on "Partogramme"
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
  );
