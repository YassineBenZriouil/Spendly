# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project specifics

- Expo SDK 57 (`expo ~57.0.x`), React Native 0.86, React 19.2, TypeScript strict. Versioned docs: https://docs.expo.dev/versions/v57.0.0/
- npm project (`package-lock.json`), so use `npx`, not `bunx`.
- Verify with `npx tsc --noEmit`, `npx expo lint`, `npm test` (Jest, `jest-expo` preset). Single test: `npx jest src/domain/money`. Test files are `__tests__/*-test.ts(x)` next to the code.
- `app.json` enables `experiments.typedRoutes` (route hrefs are type-checked; types generated into `.expo/types` by `expo start`) and `experiments.reactCompiler` (avoid manual `useMemo`/`useCallback` unless needed; use Reanimated shared values via `.get()`/`.set()`, not `.value`, or lint fails).
- Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- Hermes on iOS has a partial `Intl`: `NumberFormat#formatToParts` is missing (Jest/Node has it, so tests won't catch it). Only use `Intl.NumberFormat#format`; derive anything else from formatted output (see `money.pattern.ts`).

## Architecture

The app is **Spendly**, a local-only expense tracker. Product/design spec: `context/IDENTITY.md`; build order and per-phase done criteria: `context/PHASES.md` (read both before feature work). IDENTITY.md says "bare RN, not Expo" — PHASES.md overrides this: stay on Expo (Expo Router, expo-sqlite, expo-haptics, …). No backend ever; Settings will have a disabled "Sync data" button only.

- **Routes** (`src/app/`): root `Stack` (`_layout.tsx`) wraps `GestureHandlerRootView` → app `ThemeProvider` → navigation theme; holds the `(tabs)` group (Add = `index`, Activity, Insights) and `settings` as a pushed screen.
- **Theme** (`src/theme/`): `tokens.ts` holds all colors (light/dark), category colors, spacing, radius, typography. `useTheme()` from `ThemeProvider.tsx` returns `{ colors, categoryColors, scheme, preference, setPreference }`; never hard-code hex values in components.
- **Motion** (`src/animation/`): `tokens.ts` (durations, stagger, springs, `ReducedTiming`), `transitions.ts` (`settleTo`, `useEnterTransition`) and `useReducedMotion()` — every animation must read these.
- **Money** (`src/domain/money/`): amounts are integer minor units; format with `formatMoney()` (currency exponent comes from `Intl`).
- **Domain** (`src/domain/`): `expense/` (types, `createExpense`/`updateExpense` validation, `ExpenseRepository`), `category/` (built-in categories with stable ids, `CategoryRepository`). Repositories take a `() => Promise<Db>` and expose `subscribe()` so screens refresh after writes.
- **Storage** (`src/storage/`): one SQLite database (`database/connection.ts`, opened + migrated lazily on first use). Migrations in `database/migrations/` are append-only, versioned with `PRAGMA user_version`; never edit a shipped one. Timestamps are UTC ISO strings; local-day ranges come from `utils/dates.ts` and are compared as strings in SQL. Preferences and the unsaved Quick Add draft live in `expo-sqlite/kv-store`, separate from the ledger.
- **DB tests** run the real SQL against Node's built-in `node:sqlite` via `storage/database/testing/createTestDatabase.ts` (mock `expo-sqlite` in those tests). Jest runs with `TZ=America/New_York` (`jest.global-setup.js`) so DST boundaries are covered. `formatWithPattern()` (`money.pattern.ts`) formats money inside worklets where `Intl` isn't available.
- **Quick Add** (`src/features/quick-add/`): the state machine is a pure reducer (`state/quickAddReducer.ts`) — phase changes only through its events. The drag writes the displayed amount to a shared value every frame (`hooks/useAmountDrag.ts`) and commits to React state once on release. The category morph is an overlay clone measured on the UI thread (`hooks/useCategoryMorph.ts` + `components/MorphChip`). Route `src/app/(tabs)/index.tsx` just re-exports the screen.
- **Components** (`src/components/<Name>/index.tsx` + `styles.ts`): `Screen`, `Button`, `Icon`, `AmountText`, `EmptyState`, `AnimatedTabBar`, `ThemeFade` (fades light/dark switches). `Icon` maps stable keys to SF Symbols / Material Symbols via `expo-symbols`; add new icons to its map.

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
