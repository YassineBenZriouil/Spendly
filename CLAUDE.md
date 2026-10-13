# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project specifics

- Expo SDK 57 (`expo ~57.0.x`), React Native 0.86, React 19.2, TypeScript strict. Versioned docs: https://docs.expo.dev/versions/v57.0.0/
- npm project (`package-lock.json`), so use `npx`, not `bunx`.
- No test runner is configured. Verify changes with `npx expo lint` and `npx tsc --noEmit`.
- `app.json` enables `experiments.typedRoutes` (route hrefs are type-checked; types generated into `.expo/types` by `expo start`) and `experiments.reactCompiler` (avoid manual `useMemo`/`useCallback` unless needed).
- Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`.

## Architecture

- Minimal app: `src/app/_layout.tsx` is a header-less `Stack`; `src/app/index.tsx` renders centered "App" text. No shared components, hooks or theme yet.

## Git

- Never add a `Co-Authored-By: Claude` (or any Claude/AI attribution) line to commit messages or PR descriptions.
