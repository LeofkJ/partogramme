-- Dashboard: the "needs attention" widget shows active patients currently
-- in a dilation or BPM alert, which means the admin needs to read the
-- latest reading per patient from Dilation and BabyHeartFrequency. No
-- existing policy lets an admin read either table (same gap
-- 2026-07-29_admin_partogramme_select.sql closed for Partogramme itself).
--
-- Read-only, system-wide (not scoped to a hospital), same reasoning as the
-- Partogramme admin-select policy this pairs with. Reuses public.is_admin()
-- from 2026-07-27_admin_userinfo_select.sql.
--
-- Apply manually via the Supabase SQL editor.

create policy "Admins can view all Dilation rows"
  on "Dilation"
  for select
  using (public.is_admin());

create policy "Admins can view all BabyHeartFrequency rows"
  on "BabyHeartFrequency"
  for select
  using (public.is_admin());
