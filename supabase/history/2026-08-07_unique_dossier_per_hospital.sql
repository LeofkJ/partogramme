-- Dossier numbers (noFile) had zero uniqueness enforcement anywhere — a
-- plain free-typed number with no check against existing patients, client
-- or database side. Two patients at the same hospital could trivially end
-- up with the same file number, which defeats the entire point of having
-- one (staff reference patients by it — "check dossier #19" is meaningless
-- if it's ambiguous).
--
-- Scoped per hospital, not globally: each hospital numbers its own
-- patients independently, so #19 at CHU de Cotonou and #19 at Parakou are
-- both fine and expected.
--
-- Partial index (WHERE "isDeleted" = false) so a soft-deleted patient's old
-- number can be reused — matches how the rest of this app already treats
-- isDeleted as "doesn't count anymore" (see fetchPartogrammes, etc).
--
-- Apply manually via the Supabase SQL editor. Note: this will FAIL to
-- create if duplicate (hospitalId, noFile) pairs already exist among
-- non-deleted patients — check for and resolve those first with:
--
--   select "hospitalId", "noFile", count(*)
--   from "Partogramme"
--   where "isDeleted" = false
--   group by "hospitalId", "noFile"
--   having count(*) > 1;

create unique index "Partogramme_hospitalId_noFile_unique"
  on "Partogramme" ("hospitalId", "noFile")
  where "isDeleted" = false;
