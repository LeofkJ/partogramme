# PartoGraph — Architecture & Redesign Plan

PartoGraph is a partograph (labor-monitoring) tool for nurses and doctors. French UI,
Supabase backend, used on phones at the bedside and on desktop browsers at the desk.

This document describes the target architecture for the redesign. **Every existing
feature is preserved** — the redesign changes how screens look and how code is
organized, not what the app does.

---

## 1. One codebase, three platforms

This is a single Expo / React Native codebase that builds to **iOS, Android, and web**
(via `react-native-web`). There is no separate web or iOS repo, and there never should
be: stores, transport, and business rules are written once and shared everywhere.

Platform-specific behavior uses **Metro platform extensions**, never inline
`Platform.OS` checks:

```
notify.ts        ← iOS/Android implementation (default)
notify.web.ts    ← web implementation (Metro picks this automatically on web builds)
```

Importing `./notify` gives each platform the right file with zero conditionals.
`src/lib/sentry.*` already works this way.

## 2. Layers

```
┌───────────────────────────────────────────────────────┐
│ screens/          UI only. Reads state from a hook,    │
│ components/       renders it with theme tokens.        │
├───────────────────────────────────────────────────────┤
│ hooks (useLogin,  Screen logic: what happens on        │
│ useGraph, …)      submit, which dialogs are open, etc. │
│                   Written ONCE, shared by every        │
│                   platform variant of a screen.        │
├───────────────────────────────────────────────────────┤
│ store/            MobX domain stores. No UI imports:   │
│                   no Alert, no Platform, no styles.    │
│                   User feedback goes through notify.   │
├───────────────────────────────────────────────────────┤
│ transport/        Supabase calls. Typed by             │
│                   types/supabase.ts (generated).       │
└───────────────────────────────────────────────────────┘
        cross-cutting: src/theme.ts · src/lib/{logger, sentry, notify}
```

Rules:

- **Stores never import from `react-native`'s UI surface.** Errors the user must see
  go through `notify`; everything else is logged via `logger` and surfaced by the
  screen that triggered the action.
- **Screens never call the transport layer directly.** They go through stores.
- **Screen logic lives in a hook** (`useLogin`, …) so the UI file stays a dumb skin.
  This is what makes platform variants cheap: two skins, one brain.

## 3. Platform strategy: responsive first, split only on divergence

1. **Default: one file per screen, responsive.** Use `useWindowDimensions` and
   max-widths so the same screen looks right on a phone and in a browser
   (e.g. Login is a centered ≤420px card on desktop, full-width on a phone).
2. **Split only when layouts genuinely diverge.** When a screen needs a truly
   different web layout (e.g. Graph showing charts + tables side by side on
   desktop), create `Screen.web.tsx` + keep `Screen.tsx` for native, both using the
   same hook. Do not pre-split screens "just in case" — two files is a maintenance
   tax paid only when a screen earns it.
3. **Never `Platform.OS` in stores or hooks.** Platform differences are a
   presentation concern; the only sanctioned mechanism is file extensions
   (`.web.ts` / native default).

## 4. Feedback service (`src/lib/notify`)

Replaces ~30 scattered `Platform.OS === "web" ? null : Alert.alert(...)` branches —
which silently swallowed every error on web — with one API implemented per platform:

| Call | Native | Web |
|---|---|---|
| `notify.error(title, msg?)` | `Alert.alert` | dismissible banner (top of page) |
| `notify.success(msg)` | Android toast; quiet on iOS | auto-dismissing banner |
| `notify.confirm(opts) → Promise<boolean>` | `Alert.alert` two-button | `window.confirm` |

## 5. Design system (`src/theme.ts`)

Design intent: **a clinical instrument, not a template app.** Lightweight, minimal,
legible under stress and at a glance. Principles:

- **White canvas, one accent.** The interface is white/gray with dark text. A single
  restrained accent color for primary actions only.
- **Color = clinical meaning.** Red is reserved for danger/alerts (never a cancel
  button), amber for warnings, green for normal/confirmed. Decoration never uses
  semantic colors.
- **Values loud, labels quiet.** Readings (FHR, dilation, BP…) render big with
  tabular figures; labels are small and gray. A midwife reads values from a meter away.
- **Structure from spacing, not boxes.** Minimal borders/shadows; group with
  whitespace and alignment. System fonts only.
- **Built for interruption.** Touch targets ≥ 48px, destructive actions far from
  common ones and always confirmed, routine actions never confirmed, absolute
  timestamps ("14:32", never "5 min ago"), every reading attributable (who + when).

All colors, spacing, radii, and type sizes come from `src/theme.ts`. **No hardcoded
hex values in screens/components.** Changing the product's look is a token change,
not a screen-by-screen hunt.

## 6. Feature inventory (all preserved)

Auth & profile
- Email/password login (Supabase), friendly French error messages, rate-limit and
  offline messaging; stale-session cleanup on auth state change
- Registration; profile persisted 1 day (mobx-persist-store + AsyncStorage)
- Roles: **NURSE** (sees own partogrammes, edits while `IN_PROGRESS`) and
  **DOCTOR** (sees all, edits while `TRANSFERRED`)
- First-login info dialog (name, referring doctor, hospital)

Partogramme list (Menu)
- List with patient info, status color, pull-to-refresh
- Create (nurse only, FAB), delete with confirmation, open → Graph screen
- Profile/settings dialog from header

Graph screen (the partograph)
- Baby heart-frequency graph, dilation + baby-descent graph (Victory)
- Mother vitals tables: systolic/diastolic BP, heart rate, temperature,
  contraction frequency & duration, amniotic liquid state
- Comments slider; add/edit comments
- Add data via dialogs (picker or precise manual value, validated)
- Edit/delete any reading (role- and status-gated)
- Partogramme state changes with confirmation (IN_PROGRESS → TRANSFERRED → …)

Infrastructure
- Deep linking (`https://partogramme.com/*`, `mypartogramme://`)
- Sentry (per-platform via Metro extensions), structured logger
- Generated Supabase types (`npm run update-types`)

## 7. Migration plan

- [x] **Phase 0 — foundations**: `ARCHITECTURE.md`, `src/theme.ts`, `notify`
      service, purge `Platform`/`Alert` from all stores (fixes silent web errors)
- [x] **Phase 1 — Login/Register**: extract `useLogin`/`useRegister`, redesign
      responsive; web navbar on logged-out screens (`NavBar.web.tsx`)
- [x] **Phase 2 — Menu/list**: responsive redesign, status chips on clinical
      semantics, content column capped at `maxContentWidth`
- [ ] **Phase 3 — Graph**: restyled on tokens (done); still to do: extract logic
      hooks from the 766-line screen, then evaluate a `Graph.web.tsx`
      side-by-side layout
- [x] **Phase 4 — dialogs/components**: restyled on theme tokens; cancel buttons
      de-redded (red = clinical danger only). Remaining inline `Platform.OS`
      picker branches in `DialogDataInput*` still to migrate

Each phase ships independently; the app stays releasable between phases.
