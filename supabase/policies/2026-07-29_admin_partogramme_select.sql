-- Admin system: lets the Admin screen show each employee's active patient
-- count (Comptes actifs list). No existing policy lets an admin read
-- Partogramme at all — only nurses (their own) and doctors (their hospital,
-- transferred-only) can currently see rows there.
--
-- Read-only, and deliberately not scoped to the admin's own hospital (an
-- admin is system-wide, same as everywhere else in this system) — see
-- 2026-07-27_admin_userinfo_select.sql for the same pattern on userInfo.
--
-- Apply manually via the Supabase SQL editor. Reuses public.is_admin()
-- from 2026-07-27_admin_userinfo_select.sql — run that first if you haven't.

create policy "Admins can view all Partogramme rows"
  on "Partogramme"
  for select
  using (public.is_admin());
