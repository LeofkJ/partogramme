# Maternity nurse structure + transfer flow

## 1. Nurse types
Nurses split into two distinct types:
- `HOSPITAL` nurse — associated with a `hospitalId`, works alongside doctors at a hospital
- `MATERNITY` nurse — associated with a `maternityId`, works at a maternity (maternities only have nurses, never doctors on staff)

A nurse account is one type or the other, never both. Fixed at account creation, not changeable for now.

## 2. Data model
- Add a `maternity` table: `id`, `name`, `region`, and any other relevant fields (address, etc.)
- Update `userInfo` to include `nurseType` (`HOSPITAL` | `MATERNITY`), `hospitalId` (nullable FK), `maternityId` (nullable FK)
- Only one of `hospitalId` / `maternityId` populated, depending on `nurseType`

## 3. Account creation
- Only admins can create accounts (existing rule, no change)
- When admin creates a maternity nurse, they select/assign her `maternityId` at creation time

## 4. UI
- Maternity does NOT get its own dedicated screen/dashboard. Database-level concept only.
- Maternity nurses use the same generic nurse UI as hospital nurses (patient list, data entry, profile), scoped by `maternityId` instead of `hospitalId`.
- Maternity nurses get one additional capability hospital nurses don't need: the transfer action (below).

## 5. Transfer flow (maternity nurse → hospital)
When a maternity nurse needs to transfer a patient to a hospital:
- She selects a target hospital from a list **filtered to hospitals within her region** (not the full system-wide list)
- She must provide a **reason** (text field)
- She must select an **urgency level**: `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY`
- On submit, ownership of the patient moves to the target hospital, and the patient disappears from the maternity nurse's view (existing transfer/ownership logic, extended to carry `reason` and `urgencyLevel`)

## Not in scope for this pass (leave as-is or stub)
- No handling yet for "target hospital currently has no doctor available" — nurse can still submit even if unresolved; don't block on it. (Open item — see discussion below.)
- No nurse-type switching (maternity nurse becoming a hospital nurse, etc.)
- No community health worker registration flow

## Open design questions (not yet resolved)
- **What is `Partogramme.hospitalId` while a patient is still at the maternity, pre-transfer?** Most of the app's RLS, the admin dashboard's per-hospital breakdown, and doctor claim eligibility are all keyed on `hospitalId`. A maternity patient doesn't have one yet by definition — needs either a separate `maternityId` on `Partogramme` itself, or `hospitalId` staying null until transfer. Needs an answer before schema work starts.
- **"No doctor available" should not block submission**, especially for Medium/High/Emergency — recommendation is to let the transfer always go through and surface "unclaimed Emergency-tier transfer" as a Dashboard alert (reusing the existing "À surveiller" pattern), rather than stalling the nurse's workflow. Not decided yet, flagged as an open item per spec.

## Implementation instructions
Implement the schema changes, the nurse type distinction, the region-filtered hospital selector, and the reason + urgency fields on the transfer form. **Ask before changing any existing transfer/claim logic beyond adding these two new fields.**
