# Partogramme

A mobile and web app for tracking labour digitally with a partogram, the chart midwives use to follow a birth and spot problems early. Midwives at a maternity centre record the mother's and baby's vitals as labour progresses. The app flags patients who need attention and lets them be handed over to a hospital. The interface is in French.

Built with React Native and Expo (iOS, Android, web) on a Supabase backend.

<img src="assets/global_functional_schema.png" alt="Global functional schema" width="1000">

## What it does

For each patient, identified by a dossier (file) number rather than a name, the app records:

- **Baby:** heart rate, cervical dilation, descent
- **Mother:** blood pressure (systolic and diastolic), heart rate, temperature, contraction frequency and duration
- **Amniotic liquid:** none, intact, clear, meconial, bloody, or pea-soup
- **Comments:** free-text notes on the chart

Readings are plotted on graphs. The dilation graph uses the WHO green, yellow and red banding, and the same thresholds drive the alerts shown on patient cards and the hospital dashboard.

A patient moves through four states: admitted, in progress, transferred, and work finished.

### Who uses it

| Role | What they can do |
| --- | --- |
| Maternity nurse (midwife) | Registers patients, records vitals, raises manual alerts, transfers a patient to a linked hospital, and accepts transfer requests from hospital staff. |
| Doctor | Sees the hospital dashboard: alerts, the hospital's own patients, and the patients of every linked maternity. Can edit data and request a transfer. |
| Hospital nurse | Same dashboard and visibility as a doctor. |
| Admin | Creates and manages accounts, hospitals, maternities, and the links between them. Has no access to patient charts or the dashboard. |

Accounts are created by an admin with a temporary password, and the user must set their own password on first login.

### Other behaviour

- **Live updates:** edits show up on every device viewing the same patient, through Supabase realtime.
- **Offline awareness:** a banner appears when the connection drops.
- **Alerts:** automatic ones from clinical thresholds, plus manual ones raised by the midwife with a reason.
- **Transfers:** a maternity patient can be transferred to a hospital, either initiated by the midwife or requested by hospital staff and accepted by the midwife. The outcome notifies the other side.
- **Dossier numbers:** unique and claimed atomically on the server so two devices never get the same number.
- **Crash reporting:** Sentry, on native and web.

## Tech stack

- React Native 0.81 and Expo 54, TypeScript, one codebase for iOS, Android and web
- MobX for state (`mobx`, `mobx-react`, `mobx-persist-store`)
- React Navigation (native stack plus bottom tabs on mobile, a top navbar on web)
- Supabase: Postgres with row-level security, auth, realtime, and edge functions
- UI libraries: React Native Paper, React Native Elements, react-native-svg for graphs

## Getting started

You need Node (see `.nvmrc`), npm, and an Expo environment. Follow the React Native environment guide at https://reactnative.dev/docs/environment-setup if you want to run on a simulator.

```bash
npm install
```

### Environment variables

The app reads its Supabase connection from an env file chosen by the `MY_ENV` variable (via `react-native-dotenv`). Create one file per environment at the project root, for example `.env.staging`, `.env.production` or `.env.local-dev`:

```
SUPABASEURL=https://<project-ref>.supabase.co
SUPABASEKEY=<the project's anon (public) key>
```

Never put a service role key in the app or in these files.

### Run

```bash
npx expo start            # dev server, then pick a platform
npm run ios               # build and run on the iOS simulator
npm run android           # build and run on an Android emulator or device
npm run web               # run in the browser
```

The Android shortcuts set `MY_ENV` for you: `npm run android-local`, `android-dev` (staging) and `android-prod`. The `start` script in `package.json` pins a packager IP address, so change it to yours or use `npx expo start`.

To run on a physical phone, install the Expo Go or dev client app and scan the QR code from the dev server.

### Build

```bash
npm run build-android          # EAS build
npm run build-android-apk      # development APK
npm run build-android-store    # production build for the store
npm run build-ios
```

Builds use EAS, configured in `eas.json`. A static web build comes from `npx expo export --platform web`.

## Project structure

```
App.js                 Entry component: providers, navigation, global banners and dialogs
index.js               Registers the app
src/
  components/          Reusable UI (dialogs, graphs, tables, banners, icons)
  screens/             Login, Menu, AddPartogramme, Graph, Profile, Admin, HospitalDashboard
  navigation/          Bottom tab navigator and the navigation ref
  store/               MobX stores: partogramme, each vital sign, user, admin, alerts, network
  transport/           All Supabase calls (transportLayer.ts)
  lib/                 Helpers: supabase client, logger, notifications, Sentry, clinical alert
                       thresholds, validation, type guards, string utils
  theme.ts             Colours, spacing, typography
supabase/
  functions/           Edge functions for admin account management
  history/             Dated SQL files (RLS policies, functions, fixes), see below
types/
  supabase.ts          Generated database types
  constants.ts         Shared constants and enum helpers
prisma/                Early schema copy, may be out of date (see below)
assets/                Icons, splash screen, schema diagram
android/, ios/         Native projects
```

State flows from screens to MobX stores to the transport layer to Supabase. Screens do not call Supabase directly.

## Backend (Supabase)

The database, auth and edge functions live in Supabase. Row-level security enforces who can see and change what, so the access rules are in the database, not only in the app.

### Edge functions

`supabase/functions/` contains admin-only functions: `create-account`, `update-account`, `remove-account`, and `admin-list-logins`. They share a check in `_shared/adminAuth.ts` that the caller is an admin. Deploy with the Supabase CLI.

### Database changes

Schema and policy changes are plain SQL files in `supabase/history/`, named with a date prefix. They are applied by hand in the Supabase SQL editor, in date order. Later files often fix or replace earlier ones, so read them in order. Add new changes with the next date prefix and a comment at the top saying what to apply them after.

Keep this in mind when writing policies: an `.upsert()` needs a SELECT policy as well as INSERT and UPDATE, otherwise it fails with a misleading `42501` permission error.

### Regenerate the TypeScript types

After a schema change:

```bash
npm run update-types
```

This runs `supabase gen types` against the project and rewrites `types/supabase.ts`. You need to be logged in with `npx supabase login`.

### Prisma

`prisma/schema.prisma` was the original schema definition and does not include newer tables such as maternities and hospital links. Treat `types/supabase.ts` and the SQL in `supabase/history/` as the source of truth. The `update-database` and `open-prisma-studio` scripts still exist but only make sense against the old schema.

## Working on the code

- There is no automated test suite yet.
- Check types with `npx tsc --noEmit`. There are some pre-existing type errors, mostly in the stores, so compare against the baseline rather than expecting zero.
- Edits to patient data go through MobX stores and the transport layer so that realtime sync and offline handling keep working.
- Patient names are hidden throughout the UI. Use the dossier number to identify a patient.
