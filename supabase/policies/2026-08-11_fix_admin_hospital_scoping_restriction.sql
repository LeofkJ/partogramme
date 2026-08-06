-- Follow-up to 2026-08-10: the same restrictive policy also silently
-- blocked ADMINS from seeing maternity-created patients (hospitalId is
-- null there, and NULL IN (NULL) is never true in SQL) — the "Admins can
-- view all Partogramme rows" permissive policy (is_admin()) still gets
-- ANDed with this restrictive one, which never had an admin carve-out at
-- all. That's why the Dashboard's "Par maternité" breakdown showed no
-- patients even though the data is there.
--
-- Adds `is_admin()` as its own OR branch, fully exempting admins from the
-- hospital-scoping check — matching what "Admins can view all Partogramme
-- rows" already implies. Hospital nurses/doctors and maternity nurses keep
-- exactly the same behavior as after 2026-08-10.
--
-- Apply manually via the Supabase SQL editor, same as every other file
-- here.

alter policy "Users can only fetch data from the same hospital"
  on "Partogramme"
  using (
    is_admin()
    or "hospitalId" in (
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
