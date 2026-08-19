# Hospital nurse vs. doctor — what's actually built vs. what the emails say

Not implemented yet — this is a writeup of a confusion found while reviewing
the hospital-staff permission code, holding until confirmed to fix.

## What the emails actually say

Two sources this session: the meeting-notes email (inline replies) and a
separate email from a doctor, relayed by Gv, cc'ing Leo. Neither one
distinguishes hospital doctor from hospital nurse. The doctor's email is
explicit about it:

> "Hospital (**that is, every doctor/nurse in that hospital**) should see
> all the patients that are currently associated to that hospital... Clicking
> on the patient should bring the full partogram view, in read only mode if
> the patient has not been transferred (and a transfer can be requested) or
> in edit mode if she has been transferred."

> "Hospital (doctor or nurse) do not create patient, they only get the one
> that are transfered to them."

"Hospital" = doctor and nurse together, every time. Nothing in either email
gives the doctor extra capabilities the nurse doesn't have.

## What's actually built (`src/screens/Graph/Graph.tsx`)

Three places where the code disagrees with that:

### 1. `canEdit` — hospital nurse's edit clause is dead code

```ts
const canEdit =
  (isNurse && status === "IN_PROGRESS" && (isMaternityNurse || isOwnHospitalPatient)) ||
  (isDoctor && status === "TRANSFERRED");
```

A real transfer (`transferToHospital` / `acceptTransferRequest`) always sets
`hospitalId` and `state = "TRANSFERRED"` together. So a hospital nurse's
patient is never simultaneously `isOwnHospitalPatient` (hospitalId matches)
**and** `IN_PROGRESS` — by the time `hospitalId` is set, state is already
`TRANSFERRED`, which only the doctor's clause covers.

Net effect: a hospital nurse currently gets **no real edit access at all**,
even on a patient legitimately transferred to her own hospital. Only the
doctor does. The email doesn't support that split.

**Fix**: change the nurse clause to require `TRANSFERRED`, not
`IN_PROGRESS`, for `isOwnHospitalPatient`:

```ts
const canEdit =
  (isMaternityNurse && status === "IN_PROGRESS") ||
  (isNurse && !isMaternityNurse && isOwnHospitalPatient && status === "TRANSFERRED") ||
  (isDoctor && status === "TRANSFERRED");
```

### 2. EN COURS / TRANSFERÉ buttons — too permissive, not scoped at all

```ts
// EN COURS
{isNurse && ( ... changeState("IN_PROGRESS") ... )}

// TRANSFERÉ
{isNurse && !isMaternityNurse && ( ... changeState("TRANSFERRED") ... )}
```

Neither checks `isOwnHospitalPatient`. A hospital nurse browsing a linked
maternity's **not-yet-transferred** patient (which should be read-only per
the email) still sees live buttons that let her change that patient's
state directly — the exact bug that started this thread.

**Fix**: scope both to `isOwnHospitalPatient` (EN COURS should probably also
require `isMaternityNurse || isOwnHospitalPatient`, matching `canEdit`).

### 3. "Demander un transfert" — doctor-only on the chart, open to both on the dashboard

Inline version, in Graph.tsx:

```ts
{isDoctor && !isOwnHospitalPatient && (status === "ADMITTED" || status === "IN_PROGRESS") && ( ... )}
```

Dashboard version, in `HospitalDashboard.tsx`'s `handleRequest` — same
action, **no role check at all**, already works for a nurse today.

Same action, gated differently depending on which screen you're standing
on. **Fix**: drop `isDoctor` from the Graph.tsx version so it matches the
dashboard.

## What stays doctor-only

**RÉCLAMER** (claim) — sets `refDoctorId` so it's clear which specific
doctor is responsible for a patient, since several doctors share a
hospital and need individual accountability. A hospital only ever has one
nurse actually handling a given patient, so there's no nurse equivalent
need, and nothing in either email asks for one. This one's correct as-is.

## Summary

| Action | Doctor | Nurse (built) | Nurse (per email) |
|---|---|---|---|
| See hospital + linked maternity patients | ✅ | ✅ | ✅ |
| Edit once transferred | ✅ | ❌ (dead code) | should be ✅ |
| Act on a not-yet-transferred patient | ❌ (correctly blocked) | ❌ **only via UI bug — actually allowed** | ❌ |
| Request a transfer (dashboard) | ✅ | ✅ | ✅ |
| Request a transfer (chart page) | ✅ | ❌ | should be ✅ |
| RÉCLAMER (claim/attribution) | ✅ | ❌ | ❌ (correct, doctor-specific) |
