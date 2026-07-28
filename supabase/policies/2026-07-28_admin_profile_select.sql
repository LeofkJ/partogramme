-- Admin system, part 2: lets the Admin screen show an account's email in
-- its detail popup. userInfo has no email column (it lives on Profile), and
-- the existing admin SELECT policy only covers userInfo
-- (2026-07-27_admin_userinfo_select.sql) — without this, fetchAllProfiles()
-- returns nothing for an admin and the detail popup can't show an email.
--
-- Apply manually via the Supabase SQL editor, same as the other files in
-- this folder. Reuses public.is_admin() defined in
-- 2026-07-27_admin_userinfo_select.sql — run that first if you haven't.

create policy "Admins can view all Profile rows"
  on "Profile"
  for select
  using (public.is_admin());
