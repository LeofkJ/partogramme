-- One-off data fix, not a schema change: resolves duplicate dossier
-- numbers within a maternity that already existed before
-- Partogramme_maternityId_noFile_unique was created (that index only
-- blocks *new* duplicate inserts going forward — it doesn't retroactively
-- fix rows that were already duplicated). Test data at this maternity has
-- three different patients all carrying #12 (one En cours, one Transféré,
-- one Terminée), which collides the moment any of them is accepted into a
-- hospital that already has one of the others — see
-- MaternityTransferRequestsPanel.tsx's 23505 handling.
--
-- Keeps the oldest patient (by admissionDateTime) at its current number,
-- reassigns every other patient in a duplicate group to the next free
-- number at that maternity. Safe to re-run — once there are no duplicate
-- groups left, the update matches zero rows.
--
-- Apply manually via the Supabase SQL editor.

-- ============================================================
-- 1. Check first — see exactly which rows this will touch and what
--    they'll become, before running the update below. Mirrors part 2's
--    CTEs exactly (same to_renumber logic) so the new_no shown here is
--    guaranteed to match what the real update actually assigns.
-- ============================================================
with duplicates as (
  select
    id,
    "noFile",
    "admissionDateTime",
    row_number() over (
      partition by "maternityId", "noFile"
      order by "admissionDateTime" asc
    ) as rn
  from "Partogramme"
  where "maternityId" = 'cd165b2d-4583-4f36-a0c5-1a6a092da037'
    and "isDeleted" = false
),
next_start as (
  select coalesce(max("noFile"), 0) + 1 as start_no
  from "Partogramme"
  where "maternityId" = 'cd165b2d-4583-4f36-a0c5-1a6a092da037'
    and "isDeleted" = false
),
to_renumber as (
  select id, row_number() over (order by id) as offset
  from duplicates
  where rn > 1
)
select
  d.id,
  d."noFile" as current_no,
  d."admissionDateTime",
  coalesce(next_start.start_no + to_renumber.offset - 1, d."noFile") as new_no
from duplicates d
cross join next_start
left join to_renumber on to_renumber.id = d.id
order by d."noFile", d.rn;

-- ============================================================
-- 2. The actual fix — uncomment and run once you've checked the
--    preview above looks right.
-- ============================================================
-- with duplicates as (
--   select
--     id,
--     row_number() over (
--       partition by "maternityId", "noFile"
--       order by "admissionDateTime" asc
--     ) as rn
--   from "Partogramme"
--   where "maternityId" = 'cd165b2d-4583-4f36-a0c5-1a6a092da037'
--     and "isDeleted" = false
-- ),
-- to_renumber as (
--   select id, row_number() over (order by id) as offset
--   from duplicates
--   where rn > 1
-- ),
-- next_start as (
--   select coalesce(max("noFile"), 0) + 1 as start_no
--   from "Partogramme"
--   where "maternityId" = 'cd165b2d-4583-4f36-a0c5-1a6a092da037'
--     and "isDeleted" = false
-- )
-- update "Partogramme" p
-- set "noFile" = next_start.start_no + to_renumber.offset - 1
-- from to_renumber, next_start
-- where p.id = to_renumber.id;
