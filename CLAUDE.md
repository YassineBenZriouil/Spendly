# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project specifics

- Expo SDK 57 (`expo ~57.0.x`), React Native 0.86, React 19.2, TypeScript strict. Versioned docs: https://docs.expo.dev/versions/v57.0.0/
- npm project (`package-lock.json`), so use `npx`, not `bunx`.
- Verify with `npx tsc --noEmit`, `npx expo lint`, `npm test` (Jest, `jest-expo` preset). Single test: `npx jest src/domain/money`. Test files are `__tests__/*-test.ts(x)` next to the code.
- `app.json` enables `experiments.typedRoutes` (route hrefs are type-checked; types generated into `.expo/types` by `expo start`; `expo export` does not regenerate them. If tsc rejects a valid href with `/../…` entries in the error, the types are polluted on Windows: delete `.expo/types` and run `expo start` once on a free port) and `experiments.reactCompiler` (avoid manual `useMemo`/`useCallback` unless needed; use Reanimated shared values via `.get()`/`.set()`, not `.value`, or lint fails).
- Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- Hermes on iOS has a partial `Intl`: `NumberFormat#formatToParts` is missing (Jest/Node has it, so tests won't catch it). Only use `Intl.NumberFormat#format`; derive anything else from formatted output (see `money.pattern.ts`).

## Architecture

The app is **Spendly**, a local-only expense tracker. Product/design spec: `context/IDENTITY.md`; build order and per-phase done criteria: `context/PHASES.md` (read both before feature work). IDENTITY.md says "bare RN, not Expo" — PHASES.md overrides this: stay on Expo (Expo Router, expo-sqlite, expo-haptics, …). No backend ever; Settings will have a disabled "Sync data" button only.

- **Routes** (`src/app/`): root `Stack` (`_layout.tsx`) wraps `GestureHandlerRootView` → app `ThemeProvider` → navigation theme; holds the `(tabs)` group (Add = `index`, Activity, Insights) and pushed screens `settings/` (+ `currency`, `export`), `categories/` (manage + `[id]` editor, `new` to add) and `expense/[id]`. Route files only re-export screens from `src/features/*/screens/`.
- **Theme** (`src/theme/`): `tokens.ts` holds all colors (light/dark), category colors, spacing, radius, typography. `useTheme()` from `ThemeProvider.tsx` returns `{ colors, categoryColors, scheme, preference, setPreference }`; never hard-code hex values in components.
- **Motion** (`src/animation/`): `tokens.ts` (durations, stagger, springs, `ReducedTiming`), `transitions.ts` (`settleTo`, `useEnterTransition`) and `useReducedMotion()` — every animation must read these.
- **Money** (`src/domain/money/`): amounts are integer minor units; format with `formatMoney()` (currency exponent comes from `Intl`).
- **Domain** (`src/domain/`): `expense/` (types, `createExpense`/`updateExpense` validation, `ExpenseRepository`), `category/` (built-in categories with stable ids, `CategoryRepository`). Repositories take a `() => Promise<Db>` and expose `subscribe()` so screens refresh after writes.
- **Storage** (`src/storage/`): one SQLite database (`database/connection.ts`, opened + migrated lazily on first use). Migrations in `database/migrations/` are append-only, versioned with `PRAGMA user_version`; never edit a shipped one. Timestamps are UTC ISO strings; local-day ranges come from `utils/dates.ts` and are compared as strings in SQL. Preferences (`storage/preferences/preferences.ts`: `usePreferences()` in components, `getPreferences()` outside React, `updatePreferences()` persists and re-renders every reader immediately; theme, reduced motion, haptics, currency and drag settings all read from it) and the unsaved Quick Add draft (`features/quick-add/state/draftStorage.ts`) live in `expo-sqlite/kv-store`, separate from the ledger.
- **Haptics**: only through `haptics` in `src/haptics/haptics.service.ts` (`tick`/`select`/`success`); never import `expo-haptics` directly.
- **Activity / Edit** (`features/activity/`, `features/expense-details/`): Activity is an `Animated.FlatList` over `groupByDay()` items with fixed row heights (`getItemLayout`); only ids in `freshIds` (from `useExpenseSearch`) play an entering animation, so rows mounted by scrolling don't. Edit screen is route `src/app/expense/[id].tsx`; deletes hand the record to `recentlyDeleted` so Activity can offer Undo. `DetailsFields` is shared by Quick Add's details panel and the edit screen.
- **Insights / Export** (`domain/insights/`, `domain/export/csv.ts`): periods (week start from `deviceFirstWeekday()`) and day ranges are computed in JS and passed to SQL, so aggregation is exact across DST; never use SQLite `'localtime'`. Day states are `spent` / `zero` / `noData` (before the first expense or in the future), and must stay visually distinct. Charts are plain Views animated with Reanimated, one series in `colors.chart` (category colors fail CVD separation, so they only tint labelled icons). CSV goes to `Paths.cache` and the share sheet; user text is guarded against formula injection.
- **Accessibility**: text inside fixed-size controls gets `maxFontSizeMultiplier={FontScaleCap.*}` (theme tokens); free-flowing text is never capped. Important outcomes (save, delete, undo) call `AccessibilityInfo.announceForAccessibility`, since `accessibilityLiveRegion` is Android-only. Every drag has a button alternative.
- **Onboarding**: route `src/app/onboarding.tsx` (full-screen modal), pushed once from the tabs layout while `onboardingSeen` is false; Settings → About replays it. It reuses the real Quick Add components and saves nothing.
- **Release**: `eas.json` has a `preview` profile (internal distribution, Android APK) and `production`; build numbers are managed remotely by EAS. `npm run build:android` builds the preview APK; the user runs it (needs their Expo login). There is no Apple developer account, so iOS has no signed build. App ids: `com.yassinebenzriouil.spendly`. No Apple developer account: `npm run build:ios:unsigned` (profile `unsigned`, custom build `.eas/build/unsigned-ios.yml`) compiles without signing and packages `Payload/*.app` as an `.ipa` to sideload. Quick Add saves record a `pendingExpenseId` in the draft first, so a kill between the DB write and the draft reset can't produce a duplicate on relaunch.
- **Keyboard**: `react-native-keyboard-controller` (`KeyboardProvider` in the root layout). Use its `KeyboardAvoidingView` / `KeyboardAwareScrollView`, not RN's or Reanimated's deprecated `useAnimatedKeyboard`.
- **Features** (`src/features/<name>/`): `screens/`, `components/`, `hooks/`, `state/`, `utils/`; shared hooks like `useCategories` live in `features/categories/`.
- **DB tests** run the real SQL against Node's built-in `node:sqlite` via `storage/database/testing/createTestDatabase.ts` (mock `expo-sqlite` in those tests). Jest runs with `TZ=America/New_York` (`jest.global-setup.js`) so DST boundaries are covered. `formatWithPattern()` (`money.pattern.ts`) formats money inside worklets where `Intl` isn't available.
- **Quick Add** (`src/features/quick-add/`): the state machine is a pure reducer (`state/quickAddReducer.ts`) — phase changes only through its events. The drag writes the displayed amount to a shared value every frame (`hooks/useAmountDrag.ts`) and commits to React state once on release. The category morph is an overlay clone measured on the UI thread (`hooks/useCategoryMorph.ts` + `components/MorphChip`). Route `src/app/(tabs)/index.tsx` just re-exports the screen.
- **Components** (`src/components/<Name>/index.tsx` + `styles.ts`): `Screen`, `Button`, `IconButton`, `Icon`, `AmountText`, `EmptyState`, `AnimatedTabBar`, `ThemeFade` (fades light/dark switches). `Icon` maps stable keys to SF Symbols / Material Symbols via `expo-symbols`; add new icons to its map.

## Rule: everything is animated

Every visible change in the UI animates — no exceptions, including the ones that seem too small to bother with: press states, color/border/opacity changes, selection and disabled states, content appearing or disappearing, list inserts/removals, value and text changes, tab bar, tab switches, screen and sheet transitions, keyboard, toasts, errors, empty states. An instant visual state change is a bug.

- Use the tokens and helpers in `src/animation/` (`Duration`, `Springs`, `settleTo()`, `useEnterTransition()`); don't invent ad-hoc timings.
- Reduced motion is not "no animation": drop movement/scale and replace with a short fade or color timing using `ReducedTiming` (`ReduceMotion.Never`, otherwise Reanimated skips it).
- Animate on the UI thread (Reanimated shared values), never by re-rendering React per frame.
- Tab bar: `src/components/AnimatedTabBar` (sliding pill, animated icon/label); tab content transitions use `animation: 'shift'` (`'fade'` under reduced motion) in `src/app/(tabs)/_layout.tsx`.

## Rule: device testing is done by the user

The user tests every change on their own phone. Don't try to launch simulators/emulators, run native builds (`expo run:*`, `eas build`) or drive the app to verify behavior. Verify with typecheck, lint, unit tests and `npx expo export` (bundling) only, then list what the user should check on device.

## Git

- Never add a `Co-Authored-By: Claude` (or any Claude/AI attribution) line to commit messages or PR descriptions.
