# Spendly performance

Spendly must stay fast with a real history: years of entries, thousands of rows. This file holds the targets, how
to measure, what is known to be slow, and the rules that keep it fast.

## The problem (2026-10-14)

After **Settings → Data → Add 1,000 sample expenses**, the app becomes very slow:

- Changing a filter in Activity (category chip or search) takes **about 10 seconds**.
- The app feels slow overall: scrolling, switching tabs, and the screens that refresh after a save.

None of the causes below has been measured yet. They come from reading the code, ranked by likely impact.
**Measure before fixing** (see *How to measure*).

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

## How to measure

1. **Use a release build first.** A development build runs JS without optimizations, plus dev checks and
   Reanimated debug code, and can be 5–10× slower. Install the preview build (`npm run build:android`, or the
   unsigned iOS build). If it's fast there, the problem is mostly dev mode, and only the targets above matter.
2. **Time the steps.** Add temporary `[timing]` logs, like the Quick Add save log, around:
   - the SQL call in `expenseRepository.search`,
   - `groupByDay` plus the offsets loop in `ActivityScreen`,
   - from the filter tap until the list's first frame (`requestAnimationFrame` after the commit).
3. **Profile the render.** Use React DevTools Profiler (from the dev menu) and look at which components render on a
   filter change, and how many times.
4. **Check frame rate.** Turn on the Perf Monitor in the dev menu (UI and JS fps) while scrolling and filtering.
5. **Write down the before and after numbers** under *Measurements* below for every fix.

## Suspects, most likely first

### 1. Activity animates the whole list on every data change

`src/features/activity/screens/ActivityScreen/index.tsx`

- `itemLayoutAnimation={layout}` on the `Animated.FlatList`: Reanimated sets up a layout transition for every
  mounted row whenever `data` changes. With hundreds of mounted rows, a filter change starts hundreds of layout
  animations at once.
- `freshIds`: after a filter change, every row that is new to the result counts as "fresh" and gets wrapped in
  `<Animated.View entering={rowEntering}>`. A filter change can make almost every row fresh. That means hundreds of
  entering animations, and every row remounts, because the wrapper changes the element tree.
- **Fix idea:** only animate inserts and removals caused by a write (save, delete, undo), not by a filter
  change. For a filter or search change, cross-fade the whole list once, like the body cross-fade the screen
  already does, and leave rows plain. Drop `itemLayoutAnimation` when more than a few rows change.

### 2. Each row is expensive to mount

- `ExpenseRow` draws its amount with `AnimatedNumber`: one animated view per digit, with about 20 Reanimated hooks
  in that component file. A list row never needs rolling digits on mount.
- `AgainSwipe` wraps every row in its own swipe gesture handler.
- FlatList's default `windowSize` (21 screens) keeps several hundred rows mounted.
- **Fix idea:** in rows, show plain `formatMoney` text, or a cheap static mode of `AnimatedNumber`, and roll digits
  only when an amount changes. Set `windowSize` to about 7, `maxToRenderPerBatch` to about 10, and turn on
  `removeClippedSubviews` on Android. Check that rows are memoized (React Compiler should do this, but the Profiler
  will show whether it does).

### 3. The whole list is rebuilt on every render

- `groupByDay` sorts every entry on each render, and the offsets loop runs right after it.
- `renderItem`, `categoryById` and `filterCategories` are recreated on each render, so FlatList may re-render every
  visible row whenever anything on the screen changes (query text, undo bar, pending list).
- **Fix idea:** compute `items` and `offsets` once per new result. This is a place where `useMemo` is justified,
  even with the React Compiler on.

### 4. Every query loads every row

- `expenseRepository.search` returns every matching row, with no `LIMIT` (it has a `shortcut:` comment saying so).
  1,000 rows is fine for SQLite. The cost is turning every row into a JS object and passing it to the list.
- Search uses `LIKE '%…%'` on title, note and category name, which reads the whole table. That is fast at 1,000
  rows and slower at 50,000.
- There is no index on `category_id` and none on `kind`, the `live_spending` filter.
- **Fix idea:** load a page at a time (for example 200 rows, more on scroll, using the `occurred_at` cursor). Add
  indexes on `(deleted_at, occurred_at)` and `(category_id, occurred_at)` in a new migration. Only if search is
  still slow at 10,000 rows, consider an FTS5 table.

### 5. Every save refreshes everything, including hidden screens

- Tabs stay mounted. A single write fires `expenseRepository.subscribe`, and that reloads Activity's search, the
  pending repeats and Insights (about 15 queries, including the 8 baseline periods), even while the user is on
  another tab.
- The 1,000-row injection is one `saveMany`, but anything listening reloads at the same moment.
- **Fix idea:** reload only the focused screen, and mark the others stale so they reload when focused
  (`useIsFocused` / `useFocusEffect`). Debounce reloads that arrive close together.

### 6. Insights runs many queries in a row

- `loadInsights` runs totals, then by category, daily, previous period and income, then 8 baseline periods. That is
  about 15 round trips over the native bridge.
- **Fix idea:** merge the baseline into one query grouped by period, and cache results per (period, currency) until
  the next write.

### 7. Smaller things to check

- `useCategories()` in many components: make sure the cache does not re-render every reader on unrelated changes.
- Reanimated `entering` animations on cards in Insights: fine, but not per row.
- JSON writes of the Quick Add draft on every change: check that typing or dragging does not write on every frame.

## Rules from now on

- **Test with sample data.** Every feature is tried with 1,000 sample expenses (Settings → Data) before it is called
  done, and lists also with 10,000.
- **No animation per row on bulk changes.** Rows animate in or out only when a single write adds or removes them.
  Filtering, searching and loading cross-fade the list as one view.
- **Lists stay windowed:** fixed row heights (`getItemLayout`), a small `windowSize`, and no heavy components inside
  rows.
- **SQL does the work:** filter, sum and group in SQL, using indexes for every `WHERE` and `ORDER BY` on a large
  table. Never load all rows just to count or sum them.
- **Hidden screens don't reload.** A write marks them stale; they reload when shown.
- **Measure in a release build** and write the numbers below.

## Measurements

| Date | Build | Phone | Entries | Action | Before | After | Change |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |
