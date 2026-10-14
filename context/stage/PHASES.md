# Spendly — Development Phases

Source of truth for product, design and motion: [`IDENTITY.md`](./IDENTITY.md).
This file defines **build order** and **what "done" means per phase**. At the
end of Phase 7 the app is feature-complete and installable for testing.

> **Status:** all 7 phases are built in code. Still open: the Phase 7 acceptance
> checklist on an installed build (device testing is done by the user). The follow-up
> plan is [`PHASES-2.md`](./PHASES-2.md); where it changed something specified here,
> it wins (e.g. the _Default category: None / Last used_ setting was replaced by a
> time-of-day preselection in PHASES-2 Phase 1).

---

## Ground rules (apply to every phase)

1. **No backend. Everything is local.** Expenses, categories and preferences
   live on the device. No network calls, no accounts, no API layer.
2. **Sync is a disabled placeholder.** Settings shows a **Sync data** button
   that is visibly disabled ("Coming soon"), exposes `disabled` to screen
   readers, and does nothing. No sync code, queues, or remote schemas are built.
   The repository layer (Phase 2) is the seam where sync can plug in later.
3. **Stack: stay on the existing Expo project.** `IDENTITY.md` §8 says "bare
   React Native CLI, not Expo"; this repo is Expo SDK 57 with Expo Router and
   `AGENTS.md` mandates that. Expo dev builds give the same native access
   (Reanimated, Gesture Handler, SQLite), so we keep Expo. Mapping:

   | IDENTITY.md says             | We use                                |
   | ---------------------------- | ------------------------------------- |
   | React Navigation             | Expo Router (`src/app/`)              |
   | SQLite                       | `expo-sqlite`                         |
   | MMKV                         | `expo-sqlite/kv-store` (preferences)  |
   | Haptics library              | `expo-haptics`                        |
   | Export / share               | `expo-file-system` + `expo-sharing`   |
   | Locale                       | `expo-localization` + `Intl`          |
   | Reanimated / Gesture Handler | same (re-add with `npx expo install`) |

   Install only what a phase needs, always via `npx expo install`, and check
   the SDK 57 docs before using an API.

4. **Money is integer minor units.** Never floats.
5. **Business logic never depends on animation state.** A finished spring is not
   a saved expense.
6. **Every phase ends green:** `npx tsc --noEmit`, `npx expo lint`, unit tests
   pass, and the phase's checklist is verified on a dev build (iOS + Android).
7. Folder layout follows `IDENTITY.md` §8, adapted: routes in `src/app/`,
   everything else (`features/`, `domain/`, `storage/`, `animation/`,
   `components/`, `theme/`) beside it in `src/`.

---

## Phase 0 — Foundation

**Goal:** an empty but correctly wired app shell to build on.

- Rename the app to **Spendly** in `app.json` (name, slug stays, scheme).
- Install core deps: Reanimated, Gesture Handler, Worklets, `expo-haptics`,
  `expo-sqlite`, `expo-localization`. Create a development build.
- Theme system: light + dark token sets from `IDENTITY.md` §3, category color
  map, spacing scale, typography (tabular numerals). `useTheme()` hook reading
  System / Light / Dark.
- Motion tokens: `animation/tokens.ts` (`micro`, `quick`, `standard`,
  `morph`, `settle`, `stagger`) + `useReducedMotion()` (system for now).
- Navigation shell with Expo Router: **Add** (default), **Activity**,
  **Insights** + a small Settings entry point. Screens are placeholders.
- Base components: `Screen`, `Button`, `Icon` (one outline icon family),
  `AmountText`, `EmptyState`.
- Set up Jest (`jest-expo`) with one passing test.

**Done when:** the dev build launches on iOS and Android into the Add
placeholder, theme follows the system, tabs switch, tests/lint/typecheck pass.

---

## Phase 1 — Quick Add interaction (in-memory)

**Goal:** the signature tap + drag flow feels right before anything else is
built. Storage is an in-memory mock.

- `domain/money`: minor-unit types, currency exponent table, locale-aware
  `format` / `parse`. Unit-tested (0, 2, 3 decimal currencies).
- Built-in categories (10 from `IDENTITY.md` §2) as constants.
- `CategoryGrid` + `CategoryTile`: one-tap select, visible selected state
  (not color only), labels + icons.
- **Category → composer morph** (State A→B), interruptible, no orphan overlays.
- `AmountSurface`: vertical drag on the UI thread, nonlinear mapping
  (`amountFromDrag`), snapping, clamping, live digits, threshold haptics.
  Drag up = increase. Visible hint. Reset control.
- **Numeric keypad fallback** + increment/decrement buttons (accessibility).
- Quick Add state machine (`ready → categorySelected → adjustingAmount →
readyToSave → saving → saved → ready`, plus `error`) as a pure reducer.
- `SaveAction`: disabled until valid, explicit tap, double-tap guarded,
  saved confirmation (State E), composer reset (State F), **Undo** toast.
- Reduced-motion variant: morphs become short fades.

**Done when:** on a real device you can tap a category, drag an amount, save,
undo, and immediately start the next one; the same flow works with keypad only;
drag mapping, snapping and reducer transitions are unit-tested; no per-frame
React renders during drag.

---

## Phase 2 — Local data layer

**Goal:** real, durable, offline persistence behind a repository boundary.

- SQLite schema + **migrations from v1**: `expenses`, `categories`.
- Types from `IDENTITY.md` §7 (`Expense`, `ExpenseCategory`,
  `AppPreferences`). Validation (`expense.validation.ts`).
- Repositories (`expense.repository.ts`, `category.repository.ts`) and
  services: create, update, delete, list by day/range, aggregate totals.
  Atomic writes, idempotent save (client-generated id).
- Preferences store in `expo-sqlite/kv-store`, separate from the ledger.
- Seed built-in categories on first launch.
- Replace the Phase 1 mock: Save writes to SQLite; Undo deletes the record.
- Draft recovery: an unsaved draft survives app backgrounding; a failed save
  keeps the draft and shows a recoverable error.
- Today's total on Quick Add (low priority) reads from the database.

**Done when:** expenses survive app kill/relaunch; airplane mode changes
nothing; forcing a write failure keeps the draft; unit tests cover
validation, migrations, repository CRUD, local-day boundaries.

---

## Phase 3 — Details, Activity and Edit

**Goal:** add context to expenses and review/correct them.

- `+ Details` inline panel / sheet on Quick Add: title/merchant, note,
  date/time (default now), payment method. Category + amount stay visible;
  closing keeps values; empty fields are not stored.
- **Activity** screen: list grouped by day, row = icon, title or category,
  time, amount; daily totals; compact search/filter (text + category).
  Smooth with 1,000+ rows (virtualized list).
- **Expense Details / Edit**: change amount, category, details, date; Save
  changes; Delete with confirmation + Undo. Row → detail transition where
  reliable.
- Empty, loading and error states for Activity.

**Done when:** you can add an expense with details, find it in Activity, edit
every field, delete and undo; Activity empty state links back to Add; list
stays smooth with seeded bulk data.

---

## Phase 4 — Categories and Settings

**Goal:** everything configurable lives here, away from the capture flow.

- **Manage categories** (from Settings, and long-press on a tile as a
  shortcut): reorder, show/hide, add custom (name, icon, color), rename,
  restore defaults. IDs stay stable on rename.
- **Settings** screen, sparse:
  - Currency (affects new expenses only; history keeps its own currency)
  - Theme: System / Light / Dark
  - Haptics on/off
  - Reduced motion: System / On / Off
  - Default category: None / Last used _(replaced in PHASES-2 Phase 1)_
  - Drag sensitivity (precise / balanced / fast) and increment (currency-aware)
  - **Data** section: Export (wired in Phase 5) and **Sync data — disabled,
    "Coming soon"**
  - About / privacy (data never leaves the device)
- All settings persist and apply immediately.

**Done when:** every setting survives relaunch and visibly changes behavior;
hidden categories disappear from Quick Add but old expenses still render; the
Sync button is present, disabled and announced as disabled by VoiceOver/TalkBack.

---

## Phase 5 — Insights and Export

**Goal:** simple feedback and a way to get data out.

- **Insights**: period switch (week / month), total spent, comparison with
  previous period, spending by category, daily trend chart, most frequent
  category. Zero spending vs. no data are visually distinct. Totals are
  per currency (no conversion).
- Aggregations done in SQL, respecting local time zone and week start.
- **CSV export** (Settings → Data): choose date range, show included fields,
  write file and open the native share sheet. Explain where the file goes.

**Done when:** Insights numbers match hand-calculated totals for seeded data
(unit-tested); charts render in both themes; exported CSV opens correctly in
a spreadsheet app with correct amounts and dates.

---

## Phase 6 — Onboarding and accessibility

**Goal:** first launch teaches the gesture; every user can complete every flow.

- One skippable, **interactive** onboarding: tap a category → drag → Save on a
  miniature composer. Shown once, replayable from Settings.
- Accessibility pass: labels/roles/states on every control, amount control
  exposes value + adjustable actions, large font sizes don't clip amount or
  Save, 44pt / 48dp targets, color never the only signal.
- Localization: currency symbol position, decimal separators, date formats
  from device locale.
- Gesture arbitration review on both platforms (drag vs. scroll vs. back
  gesture vs. sheets).

**Done when:** a new install shows onboarding and can skip it; the full
add → edit → delete → export flow is completed with VoiceOver and TalkBack and
no drag; small screen + largest font size remains usable.

---

## Phase 7 — Polish, hardening and test build

**Goal:** a stable, testable release candidate with every feature in.

- Animation QA (`IDENTITY.md` §12): no jumps, flicker or orphan overlays;
  transitions interruptible; reduced motion everywhere.
- Performance profiling on a mid-range Android and an iPhone; fix dropped
  frames in drag, morph and Activity scrolling.
- Lifecycle: background/kill during draft, during save, during morph.
- Persistence failure tests and migration test from a v1 database.
- Final icon/splash check, app name, version `1.0.0`.
- Build installable test builds with EAS (`preview` profile): iOS (TestFlight
  or ad-hoc) and Android APK.

**Done when:** the full checklist below passes on the installed preview build.

### Final acceptance checklist

- [ ] Launch opens straight into Quick Add
- [ ] Record an expense: one tap category, drag amount, Save — no Details needed
- [ ] Same with keypad only
- [ ] Undo after save and after delete
- [ ] Optional details (title, note, date, payment method)
- [ ] Activity grouped by day, search/filter, edit, delete
- [ ] Insights for week and month, category breakdown, trend, comparison
- [ ] Category management (reorder, hide, add, rename, restore)
- [ ] Settings: currency, theme, haptics, reduced motion, default category,
      drag sensitivity, increment — all persist
- [ ] Sync data button visible and disabled
- [ ] CSV export through the share sheet
- [ ] Onboarding shown once, skippable, replayable
- [ ] Works fully offline (airplane mode) and survives app kill
- [ ] Light and dark themes
- [ ] VoiceOver and TalkBack can complete every flow
- [ ] Typecheck, lint and unit tests pass
