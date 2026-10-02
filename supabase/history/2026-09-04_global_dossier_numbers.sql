-- Dossier numbers were scoped per hospital / per maternity (see
-- 2026-08-07_unique_dossier_per_hospital.sql and
-- 2026-08-31_unique_dossier_per_maternity.sql), which is why every
-- transfer/reclaim/reassign method in partogrammeStore.ts claimed a FRESH
-- number in the destination scope: her old number had no standing there
-- and could easily already belong to someone else. That worked, but it
-- meant a patient's dossier number changed on every transfer — confusing
-- and wrong for what's supposed to be a stable patient identifier ("check
-- dossier #66" should always mean the same woman).
--
-- The only way to keep a number stable across her whole journey AND
-- guarantee it never collides anywhere she might go is to make numbers
-- global instead of scoped. This migration:
--   1. drops the two scoped unique indexes and replaces them with one
--      global unique index on noFile alone;
--   2. replaces claim_next_dossier_number's per-scope counter with a
--      single global one.
-- The corresponding app-side change (partogrammeStore.ts) now leaves
-- noFile untouched on transferToHospital / acceptTransferRequest /
-- reassignToHospital / pullBackToMaternity — it's set once, at creation,
-- and never reassigned again.
--
-- IMPORTANT — run the check below FIRST. Under the old scoped model, the
-- same number legitimately existed at two different hospitals, or at a
-- hospital and a maternity, at the same time — that's no longer allowed
-- once uniqueness is global, so any such pair blocks step 2 below from
-- being created:
--
--   select "noFile", count(*), array_agg(id) as ids
--   from "Partogramme"
--   where "isDeleted" = false
--   group by "noFile"
--   having count(*) > 1;
--
-- If that returns any rows, resolve them (renumber one of each pair) before
-- running the rest of this file — ask for a renumbering script if so,
-- rather than guessing at real patient data blind.

-- ============================================================
-- 1. Global uniqueness — replaces the two scoped indexes.
-- ============================================================
drop index if exists "Partogramme_hospitalId_noFile_unique";
drop index if exists "Partogramme_maternityId_noFile_unique";

create unique index "Partogramme_noFile_unique"
  on "Partogramme" ("noFile")
  where "isDeleted" = false;

-- ============================================================
-- 2. Global counter — replaces the per-scope one and its function.
-- ============================================================
drop function if exists claim_next_dossier_number(text, text);
drop table if exists "DossierNumberCounter";

create table "GlobalDossierNumberCounter" (
  id boolean primary key default true,
  "nextNumber" bigint not null,
  constraint "GlobalDossierNumberCounter_single_row" check (id)
);

alter table "GlobalDossierNumberCounter" enable row level security;
-- Deliberately no select/insert/update policies — only reachable through
-- claim_next_dossier_number (security definer), same as before.

create or replace function claim_next_dossier_number()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seed bigint;
  v_next bigint;
begin
  select coalesce(max("noFile"), 0) + 1 into v_seed
  from "Partogramme"
  where "isDeleted" = false;

  insert into "GlobalDossierNumberCounter" (id, "nextNumber")
  values (true, v_seed + 1)
  on conflict (id)
  do update set "nextNumber" = "GlobalDossierNumberCounter"."nextNumber" + 1
  returning "nextNumber" - 1 into v_next;

  return v_next;
end;
$$;

grant execute on function claim_next_dossier_number() to authenticated;
