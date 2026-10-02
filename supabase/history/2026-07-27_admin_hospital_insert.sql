-- Admin system, part 2: lets an admin add new hospitals from the Admin
-- screen's "Hopitaux" page instead of needing a manual SQL insert.
--
-- Apply manually via the Supabase SQL editor (same as the other admin
-- policy files). Requires public.is_admin() to already exist, see
-- 2026-07-27_admin_userinfo_select.sql.

create policy "Admins can create hospitals"
  on "hospital"
  for insert
  with check (public.is_admin());
