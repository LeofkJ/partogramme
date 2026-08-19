# Maternity ↔ hospital workflow: linking, visibility, and transfer requests

Follow-up to `MATERNITY_TRANSFER_PLAN.md` (the original maternity nurse + transfer feature). This resolves the open questions from a follow-up backlog review and extends that flow with hospital-side visibility and a request/accept path. Everything below was worked out through discussion — nothing here is assumed.

## 0. Terminology
Maternity-type nurses are called **"Sage-femme"** (midwife) everywhere the app displays their role to a viewer — account badges, her own Menu/Profile header, and anywhere a doctor sees who's assigned to a patient. Already implemented. Hospital-type nurses stay labeled "Infirmière", unchanged.

## 1. Hospital ↔ maternity relationship
- **Admin-assigned, not region-inferred.** An admin explicitly links specific maternities to specific hospitals — this is the real relationship the rest of this doc depends on.
- `region` fields on `hospital`/`maternity` stay in the schema — reference/display info only, no longer the mechanism that decides which hospitals a transfer can go to.
- Needs: a link between `maternity` and `hospital` (many-to-many capable — a maternity could reasonably relate to more than one hospital), plus a small admin UI to manage it.
- This link is the single source of truth for: which hospitals a midwife can transfer/request to, which maternities a doctor can see alerts from, and (later) what a hospital's dashboard aggregates.

## 2. Midwife's always-visible patient list
- A midwife retains permanent visibility into every patient from her own maternity, regardless of current state — including after transfer/claim/finish. This does **not** require an RLS change: the existing maternity-nurse SELECT policy already scopes by `maternityId`, not by state or by which nurse created the row. Only the client-side fetch (currently filtered to `ADMITTED`/`IN_PROGRESS`, own `nurseId` only) needs to change.
- UI: her existing sectioned list (Admis / En cours / Terminée) gains a section for transferred patients, same pattern as today — not a separate screen.
- **Hospital nurses are completely unaffected** — their fetch, RLS, and list stay exactly as they are today.

## 3. Doctor visibility into linked maternities
- A doctor at a hospital can see **alerts only** (not full patient data/chart) for patients at maternities linked to his hospital (see §1).
- Reuses the existing alert-detection logic (`needsAttention`, red-band dilation/BPM checks — already built for the Admin Dashboard's "À surveiller" widget), scoped to the doctor's own hospital's linked maternities instead of admin-wide.

## 4. Two separate transfer paths
1. **Midwife-initiated** (already built, unchanged) — she picks a target hospital, provides reason + urgency, patient moves to that hospital directly. Nothing about this changes.
2. **Doctor-initiated request** (new) — from an alert (§3), a doctor requests a transfer for a specific patient. This does **not** move the patient — it's a request the midwife must act on.

## 5. Request / accept / reject mechanics
- Midwife sees the doctor's request and can **accept** or **reject** it.
- **Accept**: patient moves to that hospital's normal unclaimed pool — same as a midwife-initiated transfer's end state. The requesting doctor is **not** auto-assigned; RÉCLAMER handles claiming, same as every other unclaimed-transfer case today. Deliberately simple, no special-cased ownership.
- **Reject**: midwife may leave a comment, but it's **optional**, not required.

## Not in scope for this pass (explicitly deferred)
- Manual alert-raise by the midwife (independent of thresholds) — simple to add later, not a blocker for anything above.
- Dilation-stall alert (e.g. 7cm for 2+ hours) — user flagged this as unconfirmed/optional themselves.
- Mini-graphs (dilation/BPM) on any dashboard, in place of raw numbers — nice-to-have, not blocking.
- Hospital-side dashboard aggregation (a hospital's dashboard showing all its linked maternities' patients together) — natural next step once §1's link exists, but not being built in this pass.
- SMS-based password reset, auto-logout after idle — flagged by the user as still TBD on implementation/timing.
- Dilation graph itself — explicitly no changes wanted.

## Implementation order
1. Hospital ↔ maternity link (schema + admin UI) — everything else depends on this.
2. Midwife's always-visible patient list (fetch + list-sectioning change only).
3. Doctor alert visibility into linked maternities (reuses existing alert logic, new scope).
4. Doctor-initiated transfer request + midwife accept/reject.

**Ask before changing any existing transfer/claim logic beyond what's described above** — same standing instruction as the original plan.
