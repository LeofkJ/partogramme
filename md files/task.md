# Task List

Raw requirements dump from a review pass, written down as-is before any implementation work starts. Several of these change or reverse decisions already built (flagged inline as **CONFLICTS WITH CURRENT BUILD**) — those need a decision before touching code, not just implementation.

**2026-08-14: all 3 flagged conflicts reversed** (hospital staff full visibility, doctor sees full maternity patient info, admin fully separated from clinical/dashboard access). See git history for the actual changes — RLS in `supabase/policies/2026-08-14_hospital_staff_full_visibility_and_admin_scope.sql`, app changes across `partogrammeStore.ts`, `transportLayer.ts`, `partogrammeList.tsx`, `Graph.tsx`, `Admin.tsx`, `adminStore.ts`. `Admin/Dashboard.tsx` was deleted (orphaned — admin has no dashboard now, `DoctorDashboard.tsx` is the only one left).

Note: "nurse" and "midwife" refer to the same role at the maternity center throughout this doc.

## Stakeholder feedback (2026-08-19) — meeting notes + doctor's email

New input from the actual stakeholders (inline replies to the original notes, plus a separate email from a doctor, cc'ing "Leo," relayed by "Gv"). This **confirms** most of what's built, **corrects** two things, and flags **two open questions for Sélim/Nicole** that shouldn't be assumed settled.

**Confirmed, matches current build:**
- Doctor sees all patients in labour associated to the hospital, flagged ones listed first — not "danger only." Matches what's built (§ Hospital staff visibility below).
- "Nearby maternity" isn't a real concept — it's patients explicitly associated to the hospital. Matches the admin-assigned `hospitalMaternityLink` approach already built, not a geographic/region thing.
- Admin creates users/hospitals/maternities only, no partogram access. Matches (§ Admin role scope below).
- Hide patient names everywhere, use file number, still recorded at enrollment. Matches (§ Patient privacy below).
- **Reconfirms the patient list ordering** (flagged first, then in-labour-not-transferred, then transferred, done below/submenu) as an explicit stakeholder requirement — this is currently **NOT built this way** (see the superseded line in § Hospital staff visibility — it was built, then explicitly reverted back to plain Admis/En cours/Terminée mid-session). Worth revisiting now that a stakeholder email confirms it directly, rather than treating the revert as final.
- Midwife manual alert-raising — "very important feature, Nicole really wants it." Elevates priority on an already-open item.

**Corrections to the original notes:**
- Reassign to a different hospital (wrong region/hospital claim) — confirmed as the midwife's own action (already built this way, matches).
- BUT: a doctor at a *different* hospital being able to request/pull a patient in ("a different hospital jumping in") is called out as **not actually discussed/agreed** — "a feature we can discuss with Sélim and Nicole." This is specifically about the doctor-request-transfer mechanic already built (`requestTransfer`, accept/reject flow) — it may need to be revisited/confirmed, not assumed settled.

**Open architecture question — do NOT implement without confirming:**
- Original notes assumed maternity↔hospital is a link at the *maternity* level (which is what `hospitalMaternityLink` currently is — an explicit admin-assigned table). The stakeholder reply pushes back: *"maternity centers aren't assigned to hospital, their patients are... a good idea to have a 'default hospital' for each maternity in settings, so when a patient is created it's added to that hospital by default, but changeable by the midwife."* And separately: *"I think we went back and forth on this. I suggest we stick to patient-hospital for now, with a default hospital for each maternity."*
  - This suggests the real model might be: **no maternity↔hospital link table at all** — instead a single "default hospital" setting per maternity that just pre-fills the transfer dialog's hospital picker, with the actual relationship living entirely on the patient (`hospitalId`), not a maternity-level link.
  - This would have real implications for how doctor visibility currently works (`hospitalMaternityLink` is what RLS uses to decide which maternities a hospital's doctors can see alerts/patients from) — if the link table goes away, that whole visibility mechanism needs rethinking too.
  - **Flagging, not touching.** This is a real architecture divergence from what's built, not a small tweak — needs an explicit decision before any code changes here.

## Patient ownership & transfer

- [x] The nurse/midwife creates the patient and associates one hospital to the patient, and can change that hospital association at any time.
- [x] The midwife/nurse is the one who transfers patients from the maternity center to a hospital in an emergency, and handles reassigning a patient to a different hospital (e.g. if claimed by the wrong region) — specifically for patients from her own maternity center.
- [x] Doctor can request a transfer/claim; the maternity midwife/nurse accepts or rejects it. **Flagged 2026-08-19**: stakeholder reply says this specific mechanic ("a different hospital jumping in") wasn't actually agreed on and needs discussion with Sélim/Nicole — built and working, but not confirmed as final scope.
- [x] Hospital staff (doctor/nurse) do not create patients — they only receive ones transferred/associated to them. **Reverted back 2026-08-19**: briefly "corrected" 2026-08-18 to let hospital nurses create patients (based on a direct instruction given before the stakeholder email was reviewed), but the doctor's actual email is explicit — "Hospital (doctor or nurse) do not create patient, they only get the one that are transfered to them." Reverted: `2026-08-19_revoke_hospital_nurse_create_patients.sql` drops the policy, "+" button narrowed back to maternity-nurse-only in `MainTabs.tsx`/`Menu.tsx`. Only maternity nurses create patients now — original line was right all along.

## Hospital staff visibility

- [x] Hospital staff (every doctor/nurse at that hospital) should see **all** patients currently associated with that hospital — both those still in labour at the maternity (not yet transferred) and those already transferred, not just flagged/in-danger ones. (Reversed 2026-08-14.)
- [x] Doctor should be able to see a maternity center's information — specifically, the doctor at the nearby hospital should be able to see that maternity centre's patients' info. (Same reversal.)
- [x] Clicking a patient opens the full partogram: read-only mode if not yet transferred (with a transfer request option), edit mode if transferred. Also fixed a bug this surfaced: RÉCLAMER would have let a doctor self-claim a linked maternity's patient directly, bypassing accept/reject — restricted to her own hospital's patients, added a real "Demander un transfert" button on the chart itself.
- [ ] Patient listing order: flagged patients at top, then in-labour-not-transferred, then transferred; done shown below/submenu. **Reopened 2026-08-19**: built, then explicitly reverted 2026-08-18 back to plain Admis → En cours → Terminée (warnings moved to the dashboard only). But the 2026-08-19 doctor's email reconfirms this exact ordering as a direct requirement, independent of the dashboard. Worth revisiting — the revert may have been premature.

## Admin role scope

- [x] Admin role is separate from clinical/partogram access — admin only creates/manages users, hospitals, and maternities, and has **no** access to view partogrammes. `Admin/Dashboard.tsx` deleted.

## Patient privacy

- [x] Patient names should be hidden everywhere in the UI (still recorded at enrollment) — use file number instead of name for display. **Done 2026-08-19** — swapped to "Dossier #X" in `partogrammeList.tsx`, `Graph.tsx`'s chart header, `MaternityTransferRequestsPanel.tsx`, and all 3 spots in `HospitalDashboard.tsx`. Name is still collected at enrollment (`AddPartogramme.tsx` input fields untouched) and still stored (`patientFirstName`/`patientLastName` stay on the data model) — just never rendered anywhere in the UI now. Also deleted `DialogSimpleList.tsx`, found orphaned (zero importers) while sweeping for name displays.

## Dashboard scope

- [x] Hospital dashboard shows all maternity centers linked to it and their actual patients (not just counts — built as plain counts first, explicitly rejected as useless, redone as real patient rows).
- [x] One hospital's dashboard aggregates all its associated maternity centers.
- [x] ~~Hospital-maternity association is by region~~ — **clarified 2026-08-18**: it's admin-assigned via `hospitalMaternityLink`, not automatic region matching; region stays as reference/display info only. Confirmed intentional, not a bug. **Reopened 2026-08-19**: see the "Open architecture question" at the top of this doc — stakeholder feedback suggests the real model might be patient-hospital only, with a per-maternity "default hospital" setting, not a maternity-level link table at all. Not resolved, don't build against either assumption yet.
- [x] ~~Each maternity center's own dashboard should show all patients~~ — **resolved 2026-08-18**: explicitly decided NOT needed — a midwife's own patient list already shows every patient at her maternity permanently, a separate dashboard would just duplicate that.
- [x] Dashboard is scoped per-hospital, not global.
- [x] ~~Admin dashboard shows counts + alerts~~ — **reassigned 2026-08-18**: admin has no dashboard at all now (see Admin role scope above). Built as the shared hospital-staff dashboard instead (`HospitalDashboard.tsx`), explicitly built "without connecting it to admin."
  - [x] Clicking an alert goes directly to that patient.
  - [x] Shows which patients are currently admitted (À l'hôpital section, real rows).
  - [x] Alerts stack (À surveiller section, one row per flagged patient).
  - [x] Non-flagged patients shown too, not highlighted.
- [x] ~~Known bug: hospital/maternity toggle on admin dashboard~~ — moot, that screen no longer exists.
- [x] ~~Admin dashboard stays scoped to one hospital~~ — moot, same reason.
- [ ] Midwife should also be able to raise/flag an alert manually — keep this simple. **Still open.**
- [~] Alert system overall needs to be robust/well-designed — ongoing, not a discrete checkbox (real red/yellow band + BPM threshold logic exists and is shared across the list/dashboard).
- [ ] Preferable: dashboard should show mini graphs (dilation/BPM) per patient rather than raw numbers. **Deferred — decide later.**

## Alerts

- [x] Alert/notification only fires on red; yellow is watch-only (dilation graph).
- [ ] Midwife can manually raise an alarm anytime, independent of thresholds. **Still open** (same item as above).
- [ ] Optional/unconfirmed: alert if dilation stalls (e.g. 7cm for 2+ hrs) — would become a hospital-side alert. **Still open, unconfirmed.**

## Roles & profile

- Midwives are always on duty at the maternity center. (Not a build task — informational.)
- [ ] Phone number mandatory, email optional. **Not verified** — haven't checked account-creation form validation.

## Auth

- [ ] Password reset via phone/SMS instead of email — implementation TBD. **Still open.**
- [ ] Auto-logout after ~20-30 min idle, requiring reconnect — timing/flow not finalized. **Still open.**

## Misc

- Dilation graph should stay simple overall. (Guardrail, not a task.)

## Other open threads (not from the original notes, found along the way)

- [ ] `saveUserInfo` (profile self-edit) uses the same `.upsert()` shape as two confirmed bugs today — not verified broken, just flagged as the same risk pattern.
- [ ] Duplicate-hospital data audit — found and fixed one duplicate ("La Croix de Zinvie Hôpital" x2, one soft-deleted with 15 patients + 4 nurses still attached) by accident while debugging. Haven't checked if others exist.
