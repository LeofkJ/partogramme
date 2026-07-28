-- Admin system, part 3: lets an admin remove a hospital (soft-delete via
-- isDeleted, same pattern as Partogramme/userInfo everywhere else in this
-- app) from the Admin screen's "Hopitaux" page.
--
-- Apply manually via the Supabase SQL editor. Requires public.is_admin()
-- to already exist, see 2026-07-27_admin_userinfo_select.sql.

create policy "Admins can update hospitals"
  on "hospital"
  for update
  using (public.is_admin())
  with check (public.is_admin());
