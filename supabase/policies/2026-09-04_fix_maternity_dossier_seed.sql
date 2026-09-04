-- Fixes claim_next_dossier_number's maternity-scope seed (still buggy after
-- 2026-09-04_fix_dossier_counter_maternity_text_id.sql fixed the type
-- mismatch): on a scope's first-ever claim it seeds from max("noFile")
-- where "hospitalId" is null. That filter matches the actual uniqueness
-- constraint's scope (Partogramme_maternityId_noFile_unique), but it's
-- wrong for the SEED specifically — pullBackToMaternity claims the new
-- number *before* nulling the patient's own hospitalId, so a patient being
-- reclaimed is excluded from her own seed calculation. On a maternity's
-- first-ever successful claim (which, given every maternity-scope claim
-- has been failing until the previous fix, a reclaim very likely is), this
-- undercounts and can hand back something like #1, stomping the patient's
-- real number.
--
-- Fix: seed from every patient this maternity has ever had, transferred or
-- not — a reclaimed patient's own prior number now counts toward her own
-- seed. Seeding high is always safe (it only has to avoid collisions, it
-- doesn't need to be tight); the uniqueness index itself is unaffected by
-- this, only the counter's starting point.
--
-- Also resets any maternity-scope counter rows already poisoned by the old
-- seed logic (there should be at most a couple, since this bug could only
-- have fired since the previous fix went in) so they reseed correctly on
-- next use. Hospital-scope counters are untouched — that branch was never
-- affected.
--
-- Apply manually via the Supabase SQL editor, after
-- 2026-09-04_fix_dossier_counter_maternity_text_id.sql.
--
-- IMPORTANT: if a patient already got handed a wrong/colliding number by
-- the bug (e.g. reset to #1), her "noFile" needs a manual correction after
-- running this — this migration only fixes the function and the counter
-- going forward, it can't know what her real number should be.

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
    where "maternityId" = p_scope_id and "isDeleted" = false;
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

delete from "DossierNumberCounter" where "scopeType" = 'maternity';
