-- Doctor visibility into linked maternities' alerts, and the
-- doctor-requests/midwife-accepts-or-rejects transfer mechanic (see
-- MATERNITY_HOSPITAL_WORKFLOW_PLAN.md §3-5).
--
-- Apply manually via the Supabase SQL editor, after
-- 2026-08-12_hospital_maternity_link.sql (this depends on
-- "hospitalMaternityLink" existing).

-- ============================================================
-- 1. New columns on Partogramme for the request/accept/reject flow.
--    Presence of transferRequestHospitalId = a pending request. Accept
--    clears it (as part of the normal transfer, see app code); reject
--    clears it too, optionally leaving a comment. No FK on
--    transferRequestByDoctorId — informational only (the requesting
--    doctor's profileId), doesn't need referential integrity.
-- ============================================================

alter table "Partogramme" add column "transferRequestHospitalId" uuid references "hospital"(id);
alter table "Partogramme" add column "transferRequestByDoctorId" text;
alter table "Partogramme" add column "transferRequestRejectionComment" text;

-- ============================================================
-- 2. Doctors can SELECT (alerts only, via app-level field choices — RLS
--    grants the row, the UI only surfaces alert-relevant fields) patients
--    at maternities linked to their own hospital, while still at the
--    maternity (not yet transferred). Both the permissive grant and the
--    restrictive hospital-scoping policy need the same new branch — see
--    2026-08-10/2026-08-11 for why the restrictive one alone silently
--    blocks everything without this.
-- ============================================================

create policy "Doctors can view alerts from linked maternities"
  on "Partogramme"
  for select
  using (
    exists (
      select 1 from "userInfo" u
      join "hospitalMaternityLink" hml on hml."hospitalId" = u."hospitalId"
      where u."profileId" = auth.uid()
        and u.role = 'DOCTOR'
        and hml."maternityId" = "Partogramme"."maternityId"
    )
  );

drop policy "Users can only fetch data from the same hospital" on "Partogramme";
create policy "Users can only fetch data from the same hospital"
  on "Partogramme"
  as restrictive
  for select
  using (
    is_admin()
    or "hospitalId" in (
      select "userInfo"."hospitalId" from "userInfo" where auth.uid() = "userInfo"."profileId"
    )
    or exists (
      select 1 from "userInfo"
      where "userInfo"."profileId" = auth.uid()
        and "userInfo".role = 'NURSE'
        and "userInfo"."nurseType" = 'MATERNITY'
        and "userInfo"."maternityId" = "Partogramme"."maternityId"
    )
    or exists (
      select 1 from "userInfo" u
      join "hospitalMaternityLink" hml on hml."hospitalId" = u."hospitalId"
      where u."profileId" = auth.uid()
        and u.role = 'DOCTOR'
        and hml."maternityId" = "Partogramme"."maternityId"
    )
  );

-- ============================================================
-- 3. Same linked-maternity visibility on Dilation/BabyHeartFrequency —
--    the actual readings the alert calculation (getDilationBand/
--    isBpmAlert) needs. Permissive, ORs cleanly with the existing
--    same-hospital policies on both tables, no changes needed there.
-- ============================================================

create policy "Doctors can view Dilation from linked maternities"
  on "Dilation"
  for select
  using (
    "partogrammeId" in (
      select p.id from "Partogramme" p
      join "hospitalMaternityLink" hml on hml."maternityId" = p."maternityId"
      join "userInfo" u on u."hospitalId" = hml."hospitalId"
      where u."profileId" = auth.uid()
        and u.role = 'DOCTOR'
    )
  );

create policy "Doctors can view BabyHeartFrequency from linked maternities"
  on "BabyHeartFrequency"
  for select
  using (
    "partogrammeId" in (
      select p.id from "Partogramme" p
      join "hospitalMaternityLink" hml on hml."maternityId" = p."maternityId"
      join "userInfo" u on u."hospitalId" = hml."hospitalId"
      where u."profileId" = auth.uid()
        and u.role = 'DOCTOR'
    )
  );

-- ============================================================
-- 4. Doctors can set a transfer request on a linked-maternity patient —
--    deliberately narrow: the with check clause only allows the row to
--    stay exactly as it was (still at the maternity, un-claimed) with the
--    three request columns changed, so this can never be used to
--    unilaterally claim a patient the way this policy's existence might
--    otherwise imply.
-- ============================================================

create policy "Doctors can request a transfer from linked maternities"
  on "Partogramme"
  for update
  using (
    exists (
      select 1 from "userInfo" u
      join "hospitalMaternityLink" hml on hml."hospitalId" = u."hospitalId"
      where u."profileId" = auth.uid()
        and u.role = 'DOCTOR'
        and hml."maternityId" = "Partogramme"."maternityId"
    )
    and state in ('ADMITTED', 'IN_PROGRESS')
    and "hospitalId" is null
  )
  with check (
    "hospitalId" is null
    and state in ('ADMITTED', 'IN_PROGRESS')
  );

-- Midwife's existing "Maternity nurses can update their own maternity
-- patients" policy (2026-08-09) already covers accept (a normal transfer,
-- which also clears the request columns) and reject (just clearing the
-- request columns / setting a comment) — no new policy needed for her
-- side, it has no state restriction.
