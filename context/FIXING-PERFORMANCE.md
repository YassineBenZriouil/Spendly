# Fixing Spendly performance

Spendly must stay fast and smooth with **10,000 entries**: no freezes, no lag, no dropped frames, and no UX lost on
the way. This file is the plan: do the steps **in order**, one commit each, measure before and after, and write the
numbers in *Measurements* at the bottom.

## Status (2026-10-14)

Steps 0 and 2–8 are **built in code** (typecheck, unit tests and bundling pass). Steps 1 and 9 are measurements on
the phone and are **still to do**, as is filling in *Measurements*. What changed is listed under each step
("Built:"). One cause was found that this plan didn't list: see Step 6.

## The problem (2026-10-14)

After **Settings → Data → Add 1,000 sample expenses**, the app becomes very slow:

- Changing a filter in Activity (category chip or search) takes **about 10 seconds**.
- The app feels slow overall: scrolling, switching tabs, and the screens that refresh after a save.

The causes below come from reading the code. Nothing has been measured yet. At 1,000 rows SQLite answers in
milliseconds, so the 10 seconds is almost certainly the JS thread **mounting and animating hundreds of rows**,
twice per filter change (see Step 2).

## Targets

Measured in a **release / preview build** on the slowest phone you test on, with 1,000 and with 10,000 entries.

| What | Target |
| --- | --- |
| Activity: change a filter or search, until the new list shows | under 150 ms |
| Activity: scroll | 60 fps, no blank rows |
| Tab switch (Add, Activity, Insights) | under 100 ms, no dropped frames during the transition |
| Insights: change period or currency | under 300 ms |
| Quick Add: tap Save until "saved" | under 100 ms (already logged as `[timing] expense logged in N ms`) |
| Cold start until the Add screen can be used | under 1.5 s |
| Any SQL query | under 20 ms with 10,000 rows |

## UX that must survive every step

Performance work must not cost any of this. Check it after each step, not only at the end.

- **Everything still animates** (CLAUDE.md rule). A bulk change animates **once, as a whole** (the list
  cross-fades); a single write (save, delete, undo, Again, confirm a repeat) still animates **its own row** in or
  out, and the rows around it still slide into place.
- **Reduced motion** still swaps movement for a short fade (`ReducedTiming`).
- **Undo** still appears after every write, for 5 s, and survives a restart.
- **Day headers and day totals** stay correct: a day's total is always the sum of all of that day's entries.
- **Jump anywhere**: a long list scrolls to any point without measuring (`getItemLayout` stays).
- **Amounts** still roll when they change (Quick Add, totals, Insights, a row whose amount was just edited).
- **Swipe → Again** still works on every row. Screen reader actions and move up/down buttons stay.
- **Data is never lost**: no step touches what is saved; the only schema change is a new index (Step 6).

## How to measure

1. **Use a release build.** A development build can be 5–10× slower. Install the preview build
   (`npm run build:android`, or the unsigned iOS build). Development builds are only for profiling *where* time
   goes, never for the numbers in the table.
2. **Time the steps.** Add temporary `[timing]` logs (`if (__DEV__)`), like the Quick Add save log, around the SQL
   call in `expenseRepository.search`, `groupByDay` plus the offsets loop in `ActivityScreen`, and from the filter
   tap until the list's first frame (`requestAnimationFrame` after the commit). Remove them when the step is done.
3. **Profile the render.** React DevTools Profiler (dev menu): which components render on a filter change, and
   how many times.
4. **Check frame rate.** Perf Monitor (dev menu), UI and JS fps, while scrolling and filtering.
5. **Write the numbers down** under *Measurements* for every step.

---

## Step 0 — Make 10,000 entries testable

`src/domain/expense/sampleExpenses.ts`, `src/features/settings/screens/SettingsScreen/index.tsx`

- The dev button only adds 1,000 entries, spread over 180 days. Add a second dev button for **10,000**, and spread
  samples over **3 years**, so day headers, Insights baselines and scroll length look like a real long history.
- Record the baseline numbers (1,000 and 10,000) for every row of *Targets* before changing anything else.

**Done when:** both buttons work, and the *Measurements* table has a "before" row for each target.

**Built:** Settings → Developer has *Add 1,000* and *Add 10,000 sample expenses*; samples span 3 years. The "before"
numbers need a build from before these changes (the commit before this work).

## Step 1 — Find where the 10 seconds goes (two-line test)

Before any real fix, confirm the cause with a throwaway change, in a dev build:

- make `useExpenseSearch` always return an empty `freshIds`,
- remove `itemLayoutAnimation={layout}` from the Activity list.

Change a filter with 1,000 entries. If the 10 seconds mostly disappears, Steps 2–3 are the fix and the rest is
polish. If not, the Profiler and timing logs decide what to look at first. **Revert the test change.**

**Done when:** the result is written in *Measurements*.

## Step 2 — Stop mounting every row twice

`src/features/activity/hooks/useExpenseSearch.ts`, `src/features/activity/screens/ActivityScreen/index.tsx`

Today a filter change makes almost every row "fresh". A fresh row is wrapped in `<Animated.View entering>`, a
plain row isn't. 600 ms later `freshIds` is cleared, the wrapper disappears, and React **unmounts and remounts
every one of those rows again**, each with its gesture handler and per-digit `AnimatedNumber`.

- Always render the same wrapper around a row; only switch its `entering` prop. `entering` only runs on mount, so
  changing it later does nothing, and the element tree stays the same.
- `freshIds` only for single writes: if more than a few ids are fresh (say over 5), treat none as fresh. A filter
  change is then a bulk change and is handled by Step 3.

**Done when:** a filter change mounts each visible row once (Profiler), a single save still animates its row in.

**Built:** every expense row has the same `Animated.View` wrapper; only its `entering` prop changes. The rule lives in
`features/activity/utils/nextSearchResult.ts` (tested): a new filter, or more than `ROW_ANIMATION_LIMIT` (5) rows
added + removed at once, is a bulk change with no fresh rows; otherwise the added rows are fresh.

## Step 3 — A filter or search change is one cross-fade, not hundreds of animations

`src/features/activity/screens/ActivityScreen/index.tsx`

- The body already cross-fades between error, loading, empty and list (`bodyKey`). Include the filter in the list's
  key (`list:<categoryId>:<text>`), so a new filter fades out the old list and fades in a fresh one. A fresh
  FlatList mounts only its first window (`initialNumToRender`), not every row.
- Keep `itemLayoutAnimation` for single writes only (rows sliding into a deleted row's place). On a remount there
  is nothing to slide, so it no longer runs on hundreds of rows.
- Search typing is already debounced (`SEARCH_DEBOUNCE_MS`); keep it, so the list fades once per pause, not per
  key.

**UX check:** filter change cross-fades (fade only under reduced motion), delete still slides neighbours up, undo
still brings the row back with its animation, scroll position resets to the top on a new filter (expected).

**Done when:** filter change under 150 ms at 10,000 entries.

**Built:** the search result carries a `listKey` that changes on a new filter or a bulk change; the body is keyed
`list-<listKey>`, so the existing body cross-fade replaces the list. The key changes when the *result* for the new
filter arrives, not on the tap, so the old list never shows under the new filter.

## Step 4 — Make rows cheap

`src/features/activity/components/ExpenseRow`, `PendingRow`, `AgainSwipe`, `src/components/AnimatedNumber`,
the Activity `FlatList`

- **Amount in a row:** `AnimatedNumber` builds one animated view per digit with about 20 Reanimated hooks. Add a
  cheap static mode: plain `formatMoney` text in the same font and size, switching to rolling digits only when the
  amount changes while the row is on screen (an edit). Same look, no rolling on mount, so no visible change.
- **List window:** `windowSize` about 7 (default 21 keeps several hundred rows mounted), `maxToRenderPerBatch`
  about 10, `removeClippedSubviews` on Android only. Then scroll fast at 10,000 entries: no blank rows. If blanks
  appear, raise `windowSize` one step at a time.
- **Swipe:** measure the cost of one `AgainSwipe` per row in the Profiler. Keep it if it's small; it is UX.
- **Re-renders:** check in the Profiler that typing in search or the undo bar appearing does not re-render every
  visible row (React Compiler should memoize rows; Step 5 makes its inputs stable).

**Done when:** scrolling 10,000 entries holds 60 fps with no blank rows, and rows look identical to before.

**Built:** `AnimatedNumber` has a `still` prop: one plain `Text` (number font, size and color, tabular digits)
until the value changes, then it switches to rolling digits, mounted at the old value and moved to the new one a
frame later, so an edited amount still rolls. `ExpenseRow` and `PendingRow` use it. The list has `windowSize={7}`,
`maxToRenderPerBatch={10}`, and `removeClippedSubviews` on Android. `AgainSwipe` is unchanged (measure it).

## Step 5 — Build the list data once per result

`src/features/activity/screens/ActivityScreen/index.tsx`

- `visiblePending` is a new array on every render, so `groupByDay` + the offsets loop rerun on every render
  (typing, undo bar, anything), and any memo on them misses.
- Make the inputs stable (derive `visiblePending` from `pending`, `text` and `categoryId` only), then compute
  `items` and `offsets` once per new result. `useMemo` is justified here if the Profiler shows the compiler
  doesn't catch it.
- Keep loading the **full** result. Don't page with `LIMIT`: day totals are summed from the loaded rows (a page
  boundary inside a day would show a wrong total), and `getItemLayout` needs every row to jump anywhere. Loading
  10,000 rows is fine; mounting them was the problem. Revisit only if *Measurements* show the query or row
  mapping over 50 ms at 10,000.

**Done when:** typing in search does not rerun `groupByDay` (timing log), day totals unchanged.

**Built:** checked in the React Compiler's output: it compiles `ActivityScreen` but leaves `visiblePending`,
`groupByDay` and the offsets unmemoized, so they ran on every render. They are now an explicit `useMemo` on
`result.expenses` (not `result`, which also changes when fresh rows expire) and a stable `visiblePending`. The
full result is still loaded (no `LIMIT`).

## Step 6 — SQL stays fast at 10,000 rows

`src/storage/database/migrations/index.ts` (new migration, **never edit a shipped one**), repositories,
`src/domain/insights/`

- Add a migration with indexes that match the real queries:
  `CREATE INDEX expenses_live_occurred ON expenses (occurred_at) WHERE deleted_at IS NULL` (the `live_expenses`
  view filters on `deleted_at IS NULL`) and `(category_id, occurred_at)` for the category filter.
- **Insights:** `loadInsights` makes about 15 round trips (totals, by category, daily, previous period, income, 8
  baseline periods). Merge the 8 baseline periods into one query grouped by period.
- Text search (`LIKE '%…%'` on title, note and category name) reads the whole table. Measure at 10,000; only if
  it is over the target, consider an FTS5 table.
- **Guard test** (deterministic, no timing): in a `node:sqlite` test, run `EXPLAIN QUERY PLAN` on the main
  queries (Activity search without text, category filter, Insights totals) and assert they use an index, not a
  full `SCAN` of `expenses`.

**Done when:** every query is under 20 ms at 10,000 entries, the migration test passes, and the guard test exists.

**Built:** migration v5. **Found while doing it:** SQLite chose the old `expenses_deleted_at` index for every live
read, and `deleted_at IS NULL` matches every live row, so each date-range query (today's total, every Insights
query) read the whole table, and the daily chart did it once per day of the period (31 full reads for a month).
v5 drops that index (`IF EXISTS`), adds `expenses_deleted` (only deleted rows, for the purge) and the two live-row
indexes `expenses_live_by_time (occurred_at, created_at)` and `expenses_live_by_category (category_id, occurred_at,
created_at)`. Now every read uses an index, date ranges read only their own rows, and Activity reads in index order
without sorting. `loadInsights` reads the 8 baseline periods in one query (`byCategoryInRanges`, tested equal to one
query per period). Guard test: `storage/database/__tests__/queryPlans-test.ts` records the real repositories' SQL
and checks `EXPLAIN QUERY PLAN`. Text search still reads every live row (in index order); FTS5 only if measured slow.

## Step 7 — Hidden screens don't reload on every write

`useExpenseSearch`, `usePendingOccurrences`, `useInsights`, `useTodayTotal`

- Tabs stay mounted, and every write fires `expenseRepository.subscribe` in all of them: Activity's search, the
  pending repeats and Insights (about 15 queries) all reload, even on another tab.
- On a write, the focused screen reloads; the others mark themselves stale and reload when they gain focus
  (`useIsFocused` / `useFocusEffect` from Expo Router). Coalesce reloads that arrive in the same tick.
- Coming back to a stale screen must not flash: keep showing the old data and swap in the new data with the
  existing animations.

**Done when:** a save on Add runs only Add's queries (timing logs), switching to Activity or Insights afterwards
shows the new entry, and a tab switch stays under 100 ms.

**Built:** `src/hooks/useReloadKey.ts`: a number for a loading effect's dependencies. It changes after a write to
the given repositories or when the app returns, but while the screen isn't focused (another tab, or a pushed screen
on top) it only marks the screen stale and changes once on focus. Writes in the same tick batch into one reload.
Used by `useExpenseSearch`, `usePendingOccurrences`, `useInsights` and `useTodayTotal`. The old data stays on screen
until the new data arrives; a write made elsewhere then animates in Activity when you come back to it.

## Step 8 — Smaller checks

- `useCategories()` is used in many components: make sure its cache doesn't re-render every reader on unrelated
  changes.
- Quick Add draft: confirm dragging or typing doesn't write the draft to storage on every frame (write on commit
  or debounce).
- Insights: cache results per (period, currency) until the next write, so going back and forth between periods
  is instant.
- Cold start at 10,000 entries: the Add screen must not wait for Activity or Insights data.

**Built / checked:** Insights results are cached per (period, currency, week start, day) in `useInsights` and the
cache is emptied by every write (a load that a write overtook is not cached); Retry bypasses it. Checked, no change
needed: `useCategories` re-renders readers only on category writes; the draft is written when React state changes,
and the amount drag commits to state once on release. Cold start is still to measure.

## Step 9 — Final pass at 10,000 entries

In a release build, with 10,000 sample entries:

- every row of *Targets* is met, and written in *Measurements*,
- every item of *UX that must survive every step* is checked by hand, with reduced motion on and off, in English
  and Arabic (right to left), and with the largest text size,
- `npx tsc --noEmit`, `npx expo lint`, `npm test` pass.

## Rules from now on

- **Test with sample data.** Every feature is tried with 1,000 sample expenses before it is called done, and
  lists also with 10,000.
- **No animation per row on bulk changes.** Rows animate in or out only when a single write adds or removes them.
  Filtering, searching and loading cross-fade the list as one view.
- **Same element tree before and after an animation.** Never add or remove a wrapper to start or stop an
  animation; switch props instead, or the subtree remounts.
- **Lists stay windowed:** fixed row heights (`getItemLayout`), a small `windowSize`, and no heavy components inside
  rows.
- **SQL does the work:** filter, sum and group in SQL, using indexes for every `WHERE` and `ORDER BY` on a large
  table. Never load all rows just to count or sum them.
- **Hidden screens don't reload.** A write marks them stale; they reload when shown.
- **Measure in a release build** and write the numbers below.

## Measurements

| Date | Step | Build | Phone | Entries | Action | Before | After |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |
