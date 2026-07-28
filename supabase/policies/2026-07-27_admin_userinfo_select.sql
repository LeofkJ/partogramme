-- Admin system, part 1: read access for the Admin screen's account list.
--
-- Apply manually via the Supabase SQL editor (same as
-- 2026-07-14_fix_partogramme_doctor_update_scope.sql — this repo has no
-- Supabase CLI/migration linkage). Run manual_admin_role.sql first — this
-- policy references the ADMIN role value it adds.
--
-- Deliberately NOT adding INSERT/UPDATE/DELETE policies for admin here:
-- account creation and removal both run through Edge Functions using the
-- service_role key (see supabase/functions/create-account,
-- supabase/functions/remove-account), which bypasses RLS entirely by
-- design — that's what lets those functions touch auth.users at all, which
-- a plain RLS-governed table policy could never do. This SELECT policy is
-- only for the admin's own read-only account listing from the client.
--
-- Existing per-row self-select/self-update policies (whatever lets a nurse
-- read/update their own userInfo row today) are untouched and still cover
-- an admin managing their own row (e.g. clearing their own
-- mustChangePassword flag) — no change needed there.
--
-- v2: a policy on "userInfo" that queries "userInfo" again in its own USING
-- clause caused "infinite recursion detected in policy for relation
-- userInfo" (Postgres 42P17) once actually run — Postgres re-evaluates RLS
-- on the inner query too, which can loop. Fix: move the "is this caller an
-- admin" check into a SECURITY DEFINER function. Being security definer, it
-- runs with the privileges of the function's owner (not the calling role),
-- which is what breaks the cycle — the inner lookup no longer re-triggers
-- the calling policy.

-- If you already ran the v1 version of this file, drop it first:
drop policy if exists "Admins can view all userInfo rows" on "userInfo";

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from "userInfo"
    where "profileId" = auth.uid()
      and role = 'ADMIN'
      and "isDeleted" is not true
  );
$$;

create policy "Admins can view all userInfo rows"
  on "userInfo"
  for select
  using (public.is_admin());
