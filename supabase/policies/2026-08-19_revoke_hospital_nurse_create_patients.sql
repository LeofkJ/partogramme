-- Reverses 2026-08-14_hospital_nurse_create_patients.sql.
--
-- That migration was based on a direct instruction ("nurses in a hospital
-- should be able to create patients, its onlt the doctor that cant") given
-- before this project's actual meeting notes/stakeholder email had been
-- reviewed. The doctor's own email (relayed by Gv, cc Leo) is explicit:
--
--   "Hospital (doctor or nurse) do not create patient, they only get the
--   one that are transfered to them."
--
-- Neither hospital doctors nor hospital nurses create patients — only
-- maternity nurses do (see "Maternity nurses can create patients for
-- their maternity", 2026-08-09_maternity_nurses_and_transfer.sql, left
-- untouched). UI side (the "+" add-patient button) was also narrowed back
-- to maternity-nurse-only in MainTabs.tsx and Menu.tsx.
--
-- Apply manually via the Supabase SQL editor. Idempotent, safe to re-run.

drop policy if exists "Hospital nurses can create patients for their hospital" on "Partogramme";
