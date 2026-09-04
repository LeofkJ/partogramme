-- Read-only diagnostic — not a migration, nothing to apply/keep.
-- Shows exactly why the hospital "create alert" policy is rejecting the
-- insert: it needs your account's userInfo.hospitalId to equal the
-- patient's Partogramme.hospitalId exactly. Fill in the dossier number and
-- your own login email below, then run.

select
  p."noFile",
  p."hospitalId" as patient_hospital_id,
  u.email,
  u."hospitalId" as your_hospital_id,
  u.role,
  u."nurseType",
  (p."hospitalId" = u."hospitalId") as ids_match
from "Partogramme" p
cross join (
  select ui.* from "userInfo" ui
  join "Profile" pr on pr.id = ui."profileId"
  where pr.email = '<YOUR_LOGIN_EMAIL>'
) u
where p."noFile" = <NO_FILE_HERE>;
