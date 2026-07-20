# Live sync across devices (no manual refresh)

## What it does

Any edit or new entry saved on one device (iOS, Android, or web) now shows up
automatically on every other device viewing the **same partogramme**, usually
within a second — no pull-to-refresh needed.

This already worked for the partogramme *list* on the Menu screen. It's now
also wired up for everything inside a partogramme's Graph screen: FC bébé,
dilatation, descente bébé, liquide amniotique, température, tension
systolique/diastolique, pouls, fréquence/durée des contractions, commentaires.

## How it works

- `src/store/realtimeSync.ts` — shared helper that opens a Supabase Realtime
  channel filtered to `partogrammeId = <the open partogramme>`, listening for
  `INSERT`/`UPDATE` events on a given table.
- Each of the 11 data stores subscribes via this helper as soon as it loads
  data for a partogramme, and feeds incoming rows into the same
  `updateXFromServer()` method already used for the initial load — so the
  existing reactive UI needed zero changes.
- `src/screens/Graph/Graph.tsx` unsubscribes all 11 channels when you leave
  the screen, so subscriptions don't pile up as you browse between patients.

## ⚠️ Follow-up needed (not done yet)

This depends on **Supabase Realtime replication being enabled per table**.
The `Partogramme` table already has it on (that's why the Menu list already
updated live before today). The other 10 tables (`Dilation`, `BabyDescent`,
`BabyHeartFrequency`, `amnioticLiquid`, `MotherTemperature`,
`MotherSystolicBloodPressure`, `MotherDiastolicBloodPressure`,
`MotherHeartFrequency`, `MotherContractionsFrequency`,
`MotherContractionDuration`, `Comment`) have **not been confirmed** to have
replication turned on.

**To check/fix:** Supabase Dashboard → Database → Replication → toggle each
table on for the `supabase_realtime` publication.

If a specific field doesn't update live while others do, this is almost
certainly why — check that table's replication setting first before treating
it as a code bug.

## Also fixed today (related bugs found while testing this)

- **Dilatation edits weren't saving to the server at all** — `Dilation.update()`
  was calling the wrong Supabase update method (`updateSystolicMotherBloodPressure`
  instead of `updateDilation`), so it silently updated zero rows while the UI
  looked like it saved. Fixed in `src/store/GraphData/Dilatation/dilatationStore.ts`.
- **PA Dia (diastolic blood pressure) couldn't be edited at all** —
  `MotherDiastolicBloodPressure` was missing from the `isTableData()` type
  check in `src/misc/CheckTypes.ts`, so tapping a PA Dia cell rendered nothing.
- **The whole "Modifier" feature could get permanently stuck** — if any edit
  ever failed, the dialog's internal state never reset, silently blocking
  every future "Modifier" tap until a full app reload. Fixed in
  `src/components/DataModifierDialog.tsx`.
