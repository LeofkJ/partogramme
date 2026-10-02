-- Replaces manual/guessed dossier numbers with a real server-side atomic
-- counter, scoped per hospital and per maternity (same two scopes the
-- existing unique indexes already enforce — see
-- 2026-08-07_unique_dossier_per_hospital.sql and
-- 2026-08-31_unique_dossier_per_maternity.sql). Those indexes are the
-- actual uniqueness *guarantee*; this is what makes hitting them
-- essentially impossible in normal use, by never asking a human (or a
-- racy client-side "fetch max, add 1" read) to pick the number at all.
--
-- Apply manually via the Supabase SQL editor, after the two migrations
-- named above.

-- ============================================================
-- 1. Counter table — one row per (scopeType, scopeId), lazily created on
--    first claim. Never read/written directly by the app; only through
--    the function below.
-- ============================================================
create table if not exists "DossierNumberCounter" (
  "scopeType" text not null check ("scopeType" in ('hospital', 'maternity')),
  "scopeId" uuid not null,
  "nextNumber" bigint not null,
  primary key ("scopeType", "scopeId")
);

alter table "DossierNumberCounter" enable row level security;
-- Deliberately no select/insert/update policies — every access goes
-- through claim_next_dossier_number (security definer), never PostgREST
-- directly. An authenticated user who isn't allowed to create/transfer a
-- patient in a given scope has no way to reach this table at all.

-- ============================================================
-- 2. Atomic claim function. INSERT ... ON CONFLICT DO UPDATE is what makes
--    this race-free under PostgreSQL: concurrent callers claiming the same
--    scope serialize on the row (the second waits for the first to commit,
--    then increments the value the first one actually left behind) rather
--    than both computing the same "next" number from a stale read.
--
--    On a scope's first-ever claim, seeds from the current max noFile
--    already in use there (so a hospital/maternity with existing
--    hand-entered numbers doesn't restart from 1 and collide with them).
--    Every claim after that is a pure increment — the seed query only
--    matters once per scope.
-- ============================================================
create or replace function claim_next_dossier_number(p_scope_type text, p_scope_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seed bigint;
  v_next bigint;
begin
  if p_scope_type = 'hospital' then
    select coalesce(max("noFile"), 0) + 1 into v_seed
    from "Partogramme"
    where "hospitalId" = p_scope_id and "isDeleted" = false;
  elsif p_scope_type = 'maternity' then
    select coalesce(max("noFile"), 0) + 1 into v_seed
    from "Partogramme"
    where "maternityId" = p_scope_id and "hospitalId" is null and "isDeleted" = false;
  else
    raise exception 'claim_next_dossier_number: invalid scope type %', p_scope_type;
  end if;

  insert into "DossierNumberCounter" ("scopeType", "scopeId", "nextNumber")
  values (p_scope_type, p_scope_id, v_seed + 1)
  on conflict ("scopeType", "scopeId")
  do update set "nextNumber" = "DossierNumberCounter"."nextNumber" + 1
  returning "nextNumber" - 1 into v_next;

  return v_next;
end;
$$;

grant execute on function claim_next_dossier_number(text, uuid) to authenticated;
