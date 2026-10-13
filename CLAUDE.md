# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project specifics

- Expo SDK 57 (`expo ~57.0.x`), React Native 0.86, React 19.2, TypeScript strict. Versioned docs: https://docs.expo.dev/versions/v57.0.0/
- npm project (`package-lock.json`), so use `npx`, not `bunx`.
- Verify with `npx tsc --noEmit`, `npx expo lint`, `npm test` (Jest, `jest-expo` preset). Single test: `npx jest src/domain/money`. Test files are `__tests__/*-test.ts(x)` next to the code.
- `app.json` enables `experiments.typedRoutes` (route hrefs are type-checked; types generated into `.expo/types` by `expo start`) and `experiments.reactCompiler` (avoid manual `useMemo`/`useCallback` unless needed; use Reanimated shared values via `.get()`/`.set()`, not `.value`, or lint fails).
- Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`.

## Architecture

The app is **Spendly**, a local-only expense tracker. Product/design spec: `context/IDENTITY.md`; build order and per-phase done criteria: `context/PHASES.md` (read both before feature work). IDENTITY.md says "bare RN, not Expo" — PHASES.md overrides this: stay on Expo (Expo Router, expo-sqlite, expo-haptics, …). No backend ever; Settings will have a disabled "Sync data" button only.

- **Routes** (`src/app/`): root `Stack` (`_layout.tsx`) wraps `GestureHandlerRootView` → app `ThemeProvider` → navigation theme; holds the `(tabs)` group (Add = `index`, Activity, Insights) and `settings` as a pushed screen.
- **Theme** (`src/theme/`): `tokens.ts` holds all colors (light/dark), category colors, spacing, radius, typography. `useTheme()` from `ThemeProvider.tsx` returns `{ colors, categoryColors, scheme, preference, setPreference }`; never hard-code hex values in components.
- **Motion** (`src/animation/`): `tokens.ts` (durations, stagger, springs, `ReducedTiming`), `transitions.ts` (`settleTo`, `useEnterTransition`) and `useReducedMotion()` — every animation must read these.
- **Money** (`src/domain/money/`): amounts are integer minor units; format with `formatMoney()` (currency exponent comes from `Intl`).
- **Components** (`src/components/<Name>/index.tsx` + `styles.ts`): `Screen`, `Button`, `Icon`, `AmountText`, `EmptyState`, `AnimatedTabBar`, `ThemeFade` (fades light/dark switches). `Icon` maps stable keys to SF Symbols / Material Symbols via `expo-symbols`; add new icons to its map.

## Rule: everything is animated

Every visible change in the UI animates — no exceptions, including the ones that seem too small to bother with: press states, color/border/opacity changes, selection and disabled states, content appearing or disappearing, list inserts/removals, value and text changes, tab bar, tab switches, screen and sheet transitions, keyboard, toasts, errors, empty states. An instant visual state change is a bug.

- Use the tokens and helpers in `src/animation/` (`Duration`, `Springs`, `settleTo()`, `useEnterTransition()`); don't invent ad-hoc timings.
- Reduced motion is not "no animation": drop movement/scale and replace with a short fade or color timing using `ReducedTiming` (`ReduceMotion.Never`, otherwise Reanimated skips it).
- Animate on the UI thread (Reanimated shared values), never by re-rendering React per frame.
- Tab bar: `src/components/AnimatedTabBar` (sliding pill, animated icon/label); tab content transitions use `animation: 'shift'` (`'fade'` under reduced motion) in `src/app/(tabs)/_layout.tsx`.

## Git

- Never add a `Co-Authored-By: Claude` (or any Claude/AI attribution) line to commit messages or PR descriptions.
