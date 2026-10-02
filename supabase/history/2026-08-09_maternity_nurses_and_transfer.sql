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

-- ============================================================
-- 7. RLS: maternity nurses on the clinical data tables (added 2026-08-14).
--    §6 above only ever covered "Partogramme" itself — the actual vitals
--    tables (BPM, dilation, contractions, etc.) were never given a
--    maternity-nurse policy, so a maternity nurse has never been able to
--    save a single vital sign for her own patients (confirmed live: POST
--    to BabyHeartFrequency → 403, code 42501, "new row violates row-level
--    security policy"). Same scope as §6's Partogramme UPDATE policy (the
--    nurse who created the patient, nurseId = auth.uid()).
--
--    This block is idempotent (drop-if-exists + create) and safe to re-run
--    on its own — unlike §1-6 above, which have already been applied live
--    and will error if pasted again. Only run this block, not the whole
--    file.
--
--    Permissive policies — OR cleanly with whatever hospital-nurse
--    policies already exist on these tables, no changes needed there. If
--    any of these tables also has a RESTRICTIVE hospital-scoping policy
--    (like Partogramme's "Users can only fetch data from the same
--    hospital"), this alone won't be enough — that pattern has bitten this
--    project three times already (maternity nurses, admins, doctors, all
--    on that same restrictive Partogramme policy). Retest after applying
--    and report back if still blocked.
-- ============================================================

do $$
declare
  vitals_tables text[] := array[
    'BabyHeartFrequency', 'Dilation', 'BabyDescent', 'amnioticLiquid',
    'MotherSystolicBloodPressure', 'MotherDiastolicBloodPressure',
    'MotherContractionsFrequency', 'MotherHeartFrequency',
    'MotherTemperature', 'MotherContractionDuration', 'Comment'
  ];
  t text;
begin
  foreach t in array vitals_tables loop
    execute format(
      'drop policy if exists %I on %I',
      'Maternity nurses can add ' || t || ' for their patients', t
    );
    execute format(
      'create policy %I on %I for insert with check (
         exists (
           select 1 from "Partogramme" p
           join "userInfo" u on u."profileId" = auth.uid()
           where p.id = %I."partogrammeId"
             and p."nurseId" = auth.uid()
             and u.role = ''NURSE''
             and u."nurseType" = ''MATERNITY''
         )
       )',
      'Maternity nurses can add ' || t || ' for their patients', t, t
    );

    execute format(
      'drop policy if exists %I on %I',
      'Maternity nurses can update ' || t || ' for their patients', t
    );
    execute format(
      'create policy %I on %I for update using (
         exists (
           select 1 from "Partogramme" p
           join "userInfo" u on u."profileId" = auth.uid()
           where p.id = %I."partogrammeId"
             and p."nurseId" = auth.uid()
             and u.role = ''NURSE''
             and u."nurseType" = ''MATERNITY''
         )
       ) with check (
         exists (
           select 1 from "Partogramme" p
           join "userInfo" u on u."profileId" = auth.uid()
           where p.id = %I."partogrammeId"
             and p."nurseId" = auth.uid()
             and u.role = ''NURSE''
             and u."nurseType" = ''MATERNITY''
         )
       )',
      'Maternity nurses can update ' || t || ' for their patients', t, t, t
    );
  end loop;
end $$;

-- ============================================================
-- 8. RLS: maternity nurses need SELECT too (added 2026-08-14, same day).
--    §7 above only added INSERT/UPDATE — turns out that's not enough even
--    for a plain INSERT: the app's write path goes through
--    `.upsert().eq("id", ...)`, which PostgREST/Postgres compiles to
--    `INSERT ... ON CONFLICT (id) DO UPDATE`. Confirmed live via raw SQL:
--    the exact same insert with no ON CONFLICT clause succeeded under her
--    identity, but the ON CONFLICT DO UPDATE form failed with the same
--    42501 — because Postgres needs SELECT-level RLS visibility to even
--    scan for a conflicting row, regardless of whether one exists. She's
--    had zero SELECT access to her own patients' vitals this whole time;
--    it was just invisible because an RLS-filtered-empty result and a
--    genuinely-empty result both return 200 with [].
--
--    Broader scope than §7's INSERT/UPDATE (nurseId = auth.uid(), only the
--    nurse who created the patient) — this matches Partogramme's own
--    maternity-nurse SELECT policy instead: any maternity nurse at the
--    same maternity, not just the creator, per the "permanent visibility"
--    rule already established for Partogramme itself.
--
--    Idempotent, safe to re-run on its own.
-- ============================================================

do $$
declare
  vitals_tables text[] := array[
    'BabyHeartFrequency', 'Dilation', 'BabyDescent', 'amnioticLiquid',
    'MotherSystolicBloodPressure', 'MotherDiastolicBloodPressure',
    'MotherContractionsFrequency', 'MotherHeartFrequency',
    'MotherTemperature', 'MotherContractionDuration', 'Comment'
  ];
  t text;
begin
  foreach t in array vitals_tables loop
    execute format(
      'drop policy if exists %I on %I',
      'Maternity nurses can view ' || t || ' from their maternity patients', t
    );
    execute format(
      'create policy %I on %I for select using (
         exists (
           select 1 from "Partogramme" p
           join "userInfo" u on u."profileId" = auth.uid()
           where p.id = %I."partogrammeId"
             and u.role = ''NURSE''
             and u."nurseType" = ''MATERNITY''
             and u."maternityId" = p."maternityId"
         )
       )',
      'Maternity nurses can view ' || t || ' from their maternity patients', t, t
    );
  end loop;
end $$;
