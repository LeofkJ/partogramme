-- Notify the requesting doctor/hospital nurse when their transfer request
-- is accepted or rejected — immediately if they're online when the
-- decision lands, or as soon as they next log in otherwise.
--
-- Apply manually via the Supabase SQL editor, after
-- 2026-08-19_hospital_staff_edit_and_request.sql.

-- ============================================================
-- 1. New column: transferRequestStatus. Set by the midwife's
--    accept/reject alongside the existing transferRequestByDoctorId/
--    transferRequestRejectionComment — but unlike those two, the app no
--    longer nulls transferRequestByDoctorId the moment a decision is
--    made. All three now survive until the requester has actually seen
--    the outcome popup (acknowledgeTransferRequestOutcome in
--    partogrammeStore.ts nulls all three at once), so the notification
--    still reaches them even if they were offline when it happened.
--    transferRequestHospitalId is still nulled immediately on decision
--    as before (it's what makes the request disappear from the
--    midwife's own pending list in MaternityTransferRequestsPanel).
-- ============================================================

alter table "Partogramme" add column "transferRequestStatus" text
  check ("transferRequestStatus" in ('accepted', 'rejected'));

-- ============================================================
-- 2. No new RLS needed. An accepted patient's hospitalId becomes the
--    requester's own hospital, already visible/updatable via the
--    ordinary "hospital staff can update transferred partogrammes"
--    policies (2026-08-14/2026-08-19). A rejected patient stays at the
--    maternity, already visible/updatable via "Hospital staff can view
--    patients from linked maternities" (select, 2026-08-14) and
--    "Hospital staff can request a transfer from linked maternities"
--    (update, 2026-08-19) — nulling the three outcome columns on
--    acknowledge satisfies that policy's with-check the same way setting
--    them did. This column just rides along on rows already covered.
-- ============================================================
