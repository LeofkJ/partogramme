-- Maternity nurse structure + maternity-to-hospital transfer flow.
-- See MATERNITY_TRANSFER_PLAN.md for the full spec.
--
-- Apply manually via the Supabase SQL editor, same as every other file
-- here. Run top to bottom — later statements depend on earlier ones.

-- ============================================================
-- 1. Enum types
-- ============================================================

-- A nurse account is one type or the other, fixed at creation (see
-- MATERNITY_TRANSFER_PLAN.md §1). Null for DOCTOR/ADMIN accounts, where
-- it doesn't apply.
create type "NurseType" as enum ('HOSPITAL', 'MATERNITY');

-- Fixed set per spec §5 — a maternity nurse picks one when submitting a
-- transfer.
create type "UrgencyLevel" as enum ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- ============================================================
-- 2. New "maternity" table (mirrors "hospital"'s shape)
-- ============================================================

create table "maternity" (
  id text primary key,
  name text not null,
  region text not null,
  address text,
  "isDeleted" boolean default false
);

alter table "maternity" enable row level security;

-- Broadly readable, same as "hospital" — every nurse/doctor/admin needs to
-- resolve a maternity's name (Profile display) and region (transfer's
-- hospital filter), not just admins.
create policy "Authenticated users can view maternities"
  on "maternity"
  for select
  to authenticated
  using (true);

create policy "Admins can create maternities"
  on "maternity"
  for insert
  with check (public.is_admin());

create policy "Admins can update maternities"
  on "maternity"
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 3. "hospital" gets a region too, so the transfer flow can filter
--    "hospitals within her region" by matching maternity.region.
-- ============================================================

alter table "hospital" add column "region" text;

-- ============================================================
-- 4. "userInfo": nurseType + maternityId
-- ============================================================

alter table "userInfo" add column "nurseType" "NurseType";
alter table "userInfo" add column "maternityId" text references "maternity"(id);

-- ============================================================
-- 5. "Partogramme": maternityId, transfer reason/urgency, and hospitalId
--    becomes nullable — a maternity patient has no hospital until she's
--    actually transferred (see MATERNITY_TRANSFER_PLAN.md's "open design
--    questions" section for why this was the resolved approach: mirrors
--    the same nullable-hospitalId/nullable-maternityId split as userInfo).
--    Existing hospital-nurse-created patients are entirely unaffected —
--    hospitalId is still always set for them at creation, exactly as
--    before; only maternity-created patients start with it null.
-- ============================================================

alter table "Partogramme" alter column "hospitalId" drop not null;
alter table "Partogramme" add column "maternityId" text references "maternity"(id);
alter table "Partogramme" add column "transferReason" text;
alter table "Partogramme" add column "urgencyLevel" "UrgencyLevel";

-- ============================================================
-- 6. RLS: maternity nurses on Partogramme.
--    New, additive policies only — nothing here touches or alters the
--    existing hospital-nurse/doctor policies at all.
-- ============================================================

create policy "Maternity nurses can view their own maternity patients"
  on "Partogramme"
  for select
  using (
    exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'NURSE'
        and "userInfo"."nurseType" = 'MATERNITY'
        and "userInfo"."maternityId" = "Partogramme"."maternityId"
    )
  );

create policy "Maternity nurses can create patients for their maternity"
  on "Partogramme"
  for insert
  with check (
    "nurseId" = auth.uid()
    and exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'NURSE'
        and "userInfo"."nurseType" = 'MATERNITY'
        and "userInfo"."maternityId" = "Partogramme"."maternityId"
    )
  );

-- Covers both routine data-entry updates at the maternity AND submitting
-- the transfer itself (which just sets hospitalId/state/transferReason/
-- urgencyLevel via a normal UPDATE) — one policy, since both are "the
-- nurse who created this patient acting on it."
create policy "Maternity nurses can update their own maternity patients"
  on "Partogramme"
  for update
  using (
    "nurseId" = auth.uid()
    and exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'NURSE'
        and "userInfo"."nurseType" = 'MATERNITY'
    )
  )
  with check ("nurseId" = auth.uid());
