-- Fixes claim_next_dossier_number (2026-09-04_atomic_dossier_number_counter.sql):
-- it declared p_scope_id as uuid for both scopes, but "Partogramme"."maternityId"
-- is text, not uuid (see 2026-08-12_hospital_maternity_link.sql's own comment on
-- this exact asymmetry — hospitalId is uuid, maternityId is text). Comparing
-- "maternityId" = p_scope_id::uuid blew up with "operator does not exist:
-- text = uuid" (Postgres code 42883), which PostgREST reports as a 404 —
-- looked like the function was missing when it was actually deployed and
-- crashing on every maternity-scope claim (hospital-scope claims were fine).
--
-- Apply manually via the Supabase SQL editor, after
-- 2026-09-04_atomic_dossier_number_counter.sql.

-- DossierNumberCounter.scopeId must be text to hold either a hospital uuid
-- (cast to text) or a maternity text id. Safe to alter in place: uuid -> text
-- is a lossless cast, and the table is expected to still be empty (every
-- claim so far has errored before the insert).
alter table "DossierNumberCounter" alter column "scopeId" type text using "scopeId"::text;

-- Signature is changing (uuid -> text), so CREATE OR REPLACE alone won't
-- touch the old (text, uuid) overload — drop it explicitly first.
drop function if exists claim_next_dossier_number(text, uuid);

create or replace function claim_next_dossier_number(p_scope_type text, p_scope_id text)
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
    where "hospitalId" = p_scope_id::uuid and "isDeleted" = false;
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

grant execute on function claim_next_dossier_number(text, text) to authenticated;
