-- Dossier numbers (noFile) had zero uniqueness enforcement at the
-- maternity level. Partogramme_hospitalId_noFile_unique (see
-- 2026-08-07_unique_dossier_per_hospital.sql) only applies once a patient
-- has a hospitalId — a maternity nurse's own patient only gets one later,
-- via transfer (createPartogramme sets hospitalId to null for her
-- patients at creation). So two patients created at the same maternity,
-- neither transferred yet, could carry the exact same number with zero
-- pushback from the database.
--
-- Scoped per maternity, and only while hospitalId is still null — once a
-- patient is transferred, the existing hospital-level index takes over her
-- uniqueness scope instead, so the two indexes never overlap or interact
-- with the renumber-on-transfer flow (MaternityTransferRequestsPanel.tsx).
--
-- Partial index (WHERE "isDeleted" = false) so a soft-deleted patient's old
-- number can be reused — matches Partogramme_hospitalId_noFile_unique's
-- existing convention.
--
-- Apply manually via the Supabase SQL editor. Note: this will FAIL to
-- create if duplicate (maternityId, noFile) pairs already exist among
-- non-deleted, not-yet-transferred patients — check for and resolve those
-- first with:
--
--   select "maternityId", "noFile", count(*)
--   from "Partogramme"
--   where "isDeleted" = false and "hospitalId" is null
--   group by "maternityId", "noFile"
--   having count(*) > 1;

create unique index "Partogramme_maternityId_noFile_unique"
  on "Partogramme" ("maternityId", "noFile")
  where "isDeleted" = false and "hospitalId" is null;
