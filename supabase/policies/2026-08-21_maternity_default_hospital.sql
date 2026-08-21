-- Default hospital per maternity, and free hospital choice for the
-- midwife on transfer/reassign — Gv's stakeholder email: "a good idea to
-- have a 'default hospital' for each maternity in the settings... but
-- that can be changed by the midwife." Resolves the "open architecture
-- question" flagged in task.md, in favor of this model over a
-- maternity-level hospitalMaternityLink restriction: the midwife was
-- previously only offered hospitals linked to her maternity when
-- transferring/reassigning a patient (see transferHospitalItems in
-- Graph.tsx) — she can now pick ANY hospital, with the maternity's
-- default just pre-filling the choice.
--
-- Apply manually via the Supabase SQL editor.

-- ============================================================
-- 1. New column: defaultHospitalId. Admin-set per maternity, nullable —
--    a maternity with no default configured just leaves the picker
--    unselected, no behavior change for her beyond having more choices.
--    No RLS needed for this column itself: the midwife's existing
--    "Maternity nurses can update their own maternity patients" policy
--    (2026-08-09) has no hospitalId restriction at all — with check only
--    requires nurseId = auth.uid() — so widening which hospital she's
--    allowed to pick was already a client-side-only restriction, not an
--    RLS one.
-- ============================================================

alter table "maternity" add column "defaultHospitalId" uuid references "hospital"(id);

-- ============================================================
-- 2. Admins are the only ones who set this (matches "add a maternity" /
--    "edit maternity" already being admin-only actions) — reuse whatever
--    existing admin policy already covers UPDATE on "maternity" (see
--    2026-08-09_maternity_nurses_and_transfer.sql's admin maternity
--    policies); this column rides along on that same UPDATE grant, no
--    new policy needed.
-- ============================================================
