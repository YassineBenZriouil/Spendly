# Spendly — Phases 2: from feature-complete to 10/10

`PHASES.md` built every feature. This plan makes the app excellent. Each phase has
one goal, an honest note on where the app stands today, the work, and **measurable
done criteria**. "Feels better" is never a done criterion.

---

## Ground rules (apply to every phase)

1. Everything in `PHASES.md` → Ground rules still applies: no backend, integer minor
   units, Expo, and every phase ends green (`npx tsc --noEmit`, `npx expo lint`,
   `npm test`, iOS + Android bundle).
2. **Measure before and after.** Each phase starts by recording the baseline its done
   criteria refer to (timings, frame drops, tap counts) and ends by re-measuring on a
   real iPhone and a mid-range Android phone.
3. **Every addition must survive Phase 7's test** (see below). If a phase adds a setting,
   screen or step, it must say what it replaces or why it is worth the cost.
4. Rules in `CLAUDE.md` still hold: everything that changes on screen animates
   (*feedback* animation, not decoration; see Phase 7), reduced motion, shared
   components and tokens, haptics only through `haptics`.

## Status

| Phase | In code | Still to do |
| --- | --- | --- |
| 1 — Logging under 2 s | Built | Time 20 entries per phone (dev log `[timing]`) |
| 2 — Amount drag | Built | Target-amount accuracy run; frame profiling |
| 3 — Visual identity | Built | Light/dark screenshot review |
| 4 — Zero data loss | Built | Kill tests, Undo after restart, backup across phones |
| 5 — Insights | Built | VoiceOver / TalkBack read-through |
| 6 — Accessibility & language | Built (+ in-app Language setting) | The full `ACCESSIBILITY.md` matrix |
| 7 — Remove what doesn't earn its place | Not started | A first attempt was reverted at the user's request; the Reduce motion setting stays |

**Suggested order:** 4 (data safety first) → 7 (cut before polishing) → 1 → 2 → 3 →
5 → 6. Accessibility (6) is also checked inside every other phase; Phase 6 is the
final, complete pass.

---

## Phase 1 — Logging that takes under 2 seconds

**Goal:** a typical expense is logged in **≤ 2 seconds and ≤ 3 touches**, with
nothing on the way that isn't needed for that expense.

**Today:** tap category → drag → tap Save. That is 3 touches, but the drag for larger
amounts can take several seconds, "Last used" category is opt-in, and the composer
shows controls (keypad, details, reset, − / +) that most expenses never need.

**Work**

- **Measure the real flow.** Add a debug-only timer (dev builds only, never shipped)
  that logs time from first touch to stored expense. Record 20 typical entries as the
  baseline.
- **Amount suggestions per category.** When a category is picked, show up to 3 amounts
  the user most often logs for it (computed in SQL from history, last 90 days). One tap
  fills the amount. Suggestions must never reorder while visible, and must not appear
  until the category has at least 3 expenses.
- **Smart default category.** Replace the None / Last used setting with one behavior:
  preselect the category used most at this time of day (morning coffee, lunch) only
  if it was chosen in ≥ 60% of entries at that time; otherwise nothing is preselected.
  Never preselect silently: the selected tile and the composer chip must show it.
- **Composer stays out of the way.** Keypad, details, reset and − / + remain one tap
  away, but the resting composer is: category grid, amount, Save. Secondary controls
  are grouped so they don't compete visually with the amount.
- **Save is instantly repeatable.** After Save, the composer is ready for the next
  expense within 300 ms (today the confirmation shows for 1.2 s; the next expense can
  already start, keep that and verify it).
- **No interruptions.** No dialogs, toasts that block touches, or keyboard pop-ups in
  the default path.

**Decisions made while building it**

- Suggestions: last 90 days, same category and currency, ranked by uses → most recent use → smallest amount. They
  sit in the drag hint's place under the amount (a fixed-height slot, so nothing shifts) and show only while the
  amount is zero; once an amount is set, − / + / drag / reset adjust it.
- Smart default: last 60 days, expenses within ±90 minutes of the current local time, at least 5 of them, one
  category ≥ 60% and visible. It applies only to an untouched composer (launch, after a save) through the reducer's
  `categoryPreset` event, shows its chip like any selection, and is never stored as a draft. The "Default category"
  setting is gone.
- Composer: keypad, details and reset are plain icons; − / + stay filled next to the amount.
- Timing: dev builds log `[timing] expense logged in N ms` for each save (first user input → stored).

**Done when**

- [ ] Median logged time ≤ 2.0 s across 20 timed entries on both phones (baseline recorded first). *Needs the device run: read the `[timing]` lines in the dev build's logs.*
- [x] An expense with a suggested amount takes 2 touches (category, suggestion) + Save.
- [x] No touch target in the default path is smaller than 48 × 48 pt. *(Suggestions use `Button`, controls use `IconButton`; both have a 48 pt minimum.)*
- [x] Unit tests: suggestion query (ties, minimum history, currency separation), smart-default threshold.

---

## Phase 2 — An amount drag that never surprises

**Goal:** the drag is **predictable** (the same movement always gives the same
amount), **precise** (reaching any exact amount is easy), and **safe** (no accidental
jumps), and it feels satisfying.

**Today:** amount = start + steps, where steps grow with distance^1.6
(`utils/dragMapping.ts`). Long drags accelerate, so big amounts are fast but a small
overshoot near the end can jump several steps. Haptic ticks fire every few steps, not
every step. The gesture activates after 6 pt vertical movement and fails after 24 pt
horizontal movement.

**Work**

- **Write the feel down as numbers first:** finger travel per step at rest, maximum
  acceleration, travel needed to reach common amounts (5, 12.50, 40, 100, 250). Tune
  against those targets, not by feel alone.
- **Velocity-aware precision:** slow finger movement always moves exactly one step per
  fixed distance; only fast movement accelerates. Slowing down mid-drag returns to fine
  steps immediately (no "momentum" carried over).
- **No jumps:** the amount never changes on touch-down or on activation; the first
  step requires deliberate travel. Releasing never adds or removes a step (commit
  exactly what is displayed, already true; keep it tested).
- **Edges feel physical:** at 0 and at the maximum, the number resists (rubber-band)
  with one distinct haptic, instead of silently clamping.
- **Every step is felt:** one light tick per step at slow speeds; above a speed
  threshold, ticks thin out so the phone doesn't buzz continuously.
- **Readable while moving:** the digits change in place without layout shifts (tabular
  figures, fixed width for the current number of digits), and the finger never covers
  the number (amount sits above the drag area or the drag area extends below it).
- **Gesture arbitration:** drag vs scroll vs back-swipe vs sheets, retested on both
  platforms after the changes.
- **Revisit the settings:** with good acceleration, "Drag sensitivity" and "Amount
  step" may no longer be needed (decided in Phase 7).

**Decisions made while building it** (numbers live at the top of `utils/dragMapping.ts`)

- Incremental mapping: each update applies only the new finger movement, scaled by the current speed. Below
  300 pt/s: exactly 1 step per 9 pt (balanced; 14 precise, 6 fast). Gain eases in to ×16 at 2000 pt/s
  (≈ ×3.5 at 1000 pt/s). Gain follows the current speed only, so slowing down is instantly precise again.
- Travel at balanced for common targets, from 0: 5 → 45 pt slow; 40 → 360 pt slow or ≈ 100 pt brisk;
  100 → ≈ 254 pt at 1000 pt/s or ≈ 56 pt at a flick. Cents (e.g. 12.50) are not on the drag grid: keypad.
- Activation travel (6 pt) is excluded, so the amount never moves on touch-down or activation. An off-grid typed
  amount snaps to the grid on the first step.
- Edges: at 0 / maximum, further pull is remembered and shown as a stiffening offset (max 20 pt) that springs
  back on release; moving back first undoes the pull. Reaching an edge plays `haptics.edge` (rigid) once.
  Reduced motion: no offset, the haptic and the stopped number remain.
- Ticks: one per step when slow; when fast, one per 9 pt of finger travel (ticks every `speedGain` steps), so it
  never buzzes. No clock involved, so it is deterministic.
- Not changed: the number stays centered with tabular digits (no shift within the same digit count). The
  finger-covers-number point is left to the device check below; the drag area already extends below the number.

**Done when**

- [x] Mapping is a pure function covered by tests: same input → same amount; slow drag = exactly 1 step per N pt; no change before the activation threshold; clamping and rubber-band.
- [ ] 10 test users (or 10 repetitions by you) hit 5 target amounts; ≥ 90% land exactly without correction. *Device.*
- [ ] Zero dropped frames during a 5-second continuous drag on the mid-range Android (profiled). *Device.*
- [x] No React render during the drag. *(Only `onDragStart` / `onDragEnd` reach React; every frame writes shared values.)*

---

## Phase 3 — An interface you'd recognize from a screenshot

**Goal:** Spendly has its **own look**: distinctive, calm, premium, and consistent
across every screen, in light and dark.

**Today:** clean but generic: system font, standard cards, a 56 pt amount, and numbers
that cross-fade when they change. Light/dark tokens exist (`theme/tokens.ts`).

**Work**

- **Typography:** pick one typeface with excellent tabular figures for the amount (a
  bundled font via `expo-font`), keep the system font for body text. Define the full
  type scale (amount, title, label, body, caption, numeric small) and use it
  everywhere; no ad-hoc font sizes.
- **The amount is the hero:** design the composer around the number: size, weight,
  currency symbol treatment (smaller, aligned to the baseline), decimals de-emphasized.
- **Number transitions:** digits that change roll vertically (per-digit, direction
  matching the change), unchanged digits stay still. Reduced motion: per-digit cross-fade.
  One shared `AnimatedNumber` component used for every amount and total in the app.
- **Signature details, not decoration:** one accent color used only for primary actions
  and the selected state; category colors kept to icon tints (they fail color-vision
  separation for anything larger, see `CLAUDE.md`).
- **Theme pass:** every screen checked in light and dark for contrast (WCAG AA: 4.5:1
  text, 3:1 large text and UI), elevation, and dividers. No pure black or pure white
  surfaces.
- **Consistency audit:** spacing (`Spacing`, `ListGap`), radius and surfaces are tokens
  only; a lint check (or test) fails on hard-coded colors and font sizes in components.
- **App icon, splash and store screenshots** match the new identity (the current
  adaptive icon has a faint gray outline to remove).

**Decisions made while building it**

- Numbers: Space Grotesk SemiBold, embedded at build time (`expo-font` plugin, `assets/fonts/`, OFL licence
  alongside). Body text stays on the system font, as `IDENTITY.md` asks. Metrics come from the font file
  (`NumberFont` in `theme/tokens.ts`); every digit gets the widest digit's width, so nothing shifts sideways.
- `AnimatedNumber`: each digit is a clipped column (9 0 1 … 9 0) that rolls on the UI thread; single-step carries
  roll in the direction of the change, larger jumps take the direct path; unchanged digits never move. Reduced
  motion: changed digits fade in. Used for the composer amount (live, `hero`, `fit`), the edit screen, Insights
  total, category amounts, the chart readout, Activity rows, day totals and today's total. Amounts inside
  sentences, button labels and captions stay plain text.
- Hero amount: currency symbol at half size on the digits' baseline, symbol and decimals in the secondary color.
- Accent: Save, selected `Button`s (lime fill + ink outline) and the tab bar pill (lime, with on-accent icon and
  label cross-faded in).
- Contrast fixes (light theme): `textSecondary`, `success`, `danger`, and the coral / amber / sky category colors
  were darkened slightly to pass. The light composer `surface` stays pure white, as the brand spec sets; the
  canvas behind it is warm.
- Type scale: `Typography.micro` (11) replaces three literal sizes; `NumberSize` covers numbers.
- Android icon: the foreground no longer has the faint gray square outline (it now doubles as the themed icon).

**Done when**

- [x] Every amount and total in the app uses `AnimatedNumber`.
- [x] Automated contrast check over all color token pairs passes AA in both themes. *(`theme/__tests__/contrast-test.ts`)*
- [x] No hex colors or numeric font sizes outside `theme/` (enforced by lint or test). *(`theme/__tests__/tokensOnly-test.ts`)*
- [ ] Side-by-side screenshots of all screens, light and dark, reviewed together for consistency. *Device: needs a new development build (the font is embedded natively).*

---

## Phase 4 — Zero data loss, provably

**Goal:** no action, crash, kill or full disk can lose or duplicate an expense, and
every "undo" works even after the app restarts.

**Today:** strong base: SQLite with WAL, migrations in transactions, idempotent
saves, a pending-save marker against duplicates after a kill, and the Quick Add draft
survives restarts. **Gaps:** Undo (after save and after delete) lives in memory for 5
seconds; if the app is closed in that window, the undo is gone. A deleted expense is
removed immediately. There is no way to recover from a lost or replaced phone.

**Work**

- **Soft delete:** migration v2 adds `deleted_at`. Delete sets it, every query
  excludes it, Undo clears it. Rows deleted more than 30 days ago are purged on launch.
  (Append-only migration, tested against a frozen v1 database.)
- **Persistent undo:** the last undoable action (saved or deleted expense) is stored
  with its expiry, so Undo still appears if the app is reopened within the window.
- **Edits are atomic and reversible:** an edit writes the previous version first, so
  "Undo edit" exists and a crash mid-edit never leaves a half-written row.
- **Failure handling everywhere:** every write path (save, edit, delete, category
  change, reorder, preferences) has a tested failure case: the UI keeps the user's
  input and shows `ErrorBanner`, nothing is silently dropped.
- **Disk full / database errors:** detected and explained ("Storage is full, nothing
  was saved"), never a crash.
- **Backup and restore (local, still no backend):** "Back up" writes a single file
  (all expenses, categories, preferences, versioned) to the share sheet / Files;
  "Restore" reads it, validates it completely before touching the database, and
  merges by id so restoring twice never duplicates.
- **Integrity check on launch:** `PRAGMA quick_check`; if it fails, keep the file,
  tell the user, and offer restore from backup.

**Decisions made while building it**

- Soft delete via migration v2 (`deleted_at` + a `live_expenses` view that every read uses, so no query can forget
  the filter). Purge of rows deleted > 30 days ago runs when the database opens and never blocks opening.
- Undo: one persisted slot (`saved` / `deleted` / `edited`) with its expiry (5 s) in the key-value store; a new action
  replaces the previous one. It is offered **after** the write succeeds, so it never promises to undo something that
  didn't happen. Edits are single `UPDATE`s (atomic); "Undo edit" restores the stored previous version.
- Failure handling: save, edit, delete, undo, category save/reorder/restore defaults and preferences all report
  failures (ErrorBanner or alert); a full disk gets its own message. Preference write failures are shown in Settings.
- Backup: JSON with `app`, `format: 1`, `createdAt`, expenses, categories, preferences. Restore rejects the whole file
  on any problem (not JSON, other app, newer format, unreadable record, duplicate ids, missing categories), then
  inserts in one transaction, skipping ids already present (never overwrites). Settings in the file replace the
  current ones. A locally deleted expense restored from an older backup stays deleted (its id is already present).
- Integrity: `PRAGMA quick_check` on open; on failure the file is left untouched, the app warns once and points to
  Settings → Data.
- New native module: `expo-document-picker` (restore). Needs a new development build, like the font in Phase 3.

**Done when**

- [ ] Kill-tests (kill during save, during edit, during delete, during reorder, during restore) each verified on device: no loss, no duplicate. *Device.*
- [ ] Undo works after closing and reopening the app within the window (save and delete). *Device (logic covered by `undoStore-test`).*
- [x] Tests: soft delete + purge, v1 → v2 migration with data, restore validation (corrupt, wrong version, partial), merge idempotency, every write-failure path. *(`softDelete-test`, `migrations-test`, `connection-test`, `backup-test`, `undoStore-test`, `performUndo-test`, `expense.parse-test`; UI failure paths share `writeFailureMessage`.)*
- [ ] A backup made on one phone restores correctly on another. *Device (covered end to end against real SQL in `backup-test`).*

---

## Phase 5 — Insights that tell you something

**Goal:** opening Insights answers **"is anything different?"** in a few seconds, in
plain language, without new charts.

**Today:** total, comparison with the previous period, a daily trend chart, a
category breakdown and the most frequent category. All accurate, but the user has to
interpret everything themselves.

**Work**

- **Highlights at the top:** at most 3 short sentences, ranked by importance, e.g.
  "Food is up 45% compared with your usual week", "You haven't spent on Transport
  this week", "Biggest day: Saturday, 82 €". If nothing is notable, say so ("A normal
  week"), never invent a story.
- **"Usual" means a baseline:** compare against the median of the previous 8 periods
  (weeks or months), not just the last one, so a single unusual period doesn't skew
  everything. Require enough history (≥ 4 periods) before claiming anything is
  unusual.
- **Thresholds that avoid noise:** a change is notable only if it is both relative
  (≥ 30%) and absolute (≥ a currency-aware minimum), so 2 € → 4 € is never "up 100%".
- **Per-category change:** each category row shows its change versus usual with an
  arrow and words ("up", "down", "about the same"), never color alone.
- **Tap through:** tapping a highlight or category opens Activity pre-filtered to the
  expenses behind it.
- **Remove what nobody reads:** "Most frequent category" folds into the highlights;
  the chart stays only if it earns its place in Phase 7.

**Decisions made while building it**

- Rules (`domain/insights/highlights.ts`): overall change vs usual (only when something was spent), per-category
  up/down, a usual category with nothing spent, the biggest day (≥ 40% of the period, ≥ 2 spent days), the most
  frequent category (≥ 3 expenses and ≥ 40% of them). Changes always rank above facts, then by money; ties by id.
- Baseline (`baselineWindows`): up to 8 earlier periods, each cut to the days the current one has had, and only
  periods that started after the first expense (a half-tracked first period would drag "usual" down).
- Minimum change: 10 major units (10 €, 10 $, 10 MAD), 1,000 for zero-decimal currencies. It's a rule by currency
  exponent, not real value (noted as a shortcut in the code).
- Fallbacks: "A normal week: nothing stands out" with enough history; "After a few weeks of history…" without.
- Category rows say "up 45% vs usual" / "down 30% vs usual" / "about usual" with an arrow, once there is a usual.
- Tap-through: Activity's category filter (it has no date filter, so the period isn't carried over).
- "Most frequent category" card removed: it's a highlight now. The daily chart stays until Phase 7 decides.

**Done when**

- [x] Highlight rules are pure functions with tests for every rule, thresholds, ties, short history, multiple currencies, DST weeks. *(`highlights-test`, `baseline-test`)*
- [x] Every highlight number matches a hand-calculated value on seeded data. *(`baseline-test`: 150 € vs a usual 100 € = +50%, real SQL)*
- [x] A new user with < 4 periods of history sees no "unusual" claims.
- [ ] Every highlight is read out correctly by VoiceOver and TalkBack. *Device.*

---

## Phase 6 — Accessible to everyone, everywhere

**Goal:** every flow can be completed with any combination of screen reader, largest
text size, reduced motion, switch control, and any supported language or region.

**Today:** labels, roles and states across controls; spoken confirmations; button
alternatives for drags (− / +, keypad, move up/down actions); font scaling with caps
on fixed-size controls; locale-aware money and dates. **Gaps:** all UI text is
English-only, right-to-left layouts are untested, and there is no repeatable test
matrix.

**Work**

- **Test matrix, written down and repeated each release:** VoiceOver, TalkBack,
  largest accessibility text size, Bold Text, Reduce Motion, Reduce Transparency,
  Increase Contrast, Switch Control / Switch Access, Voice Control, on the smallest
  supported screen.
- **Localization:** move every user-facing string to a translation catalog
  (`expo-localization` for the locale); add plural rules; ship English + one more
  language to prove the pipeline. Dates, numbers, currencies and week start already
  follow the device. Keep that tested.
- **Right-to-left:** verify layout mirroring, drag direction labels, chevrons and the
  tab bar with an RTL language.
- **Focus order and grouping:** each screen reads in a logical order; related text
  (e.g. an expense row) is one element, not five.
- **Every gesture has an alternative:** audit against the list of gestures (amount
  drag, category hold, category reorder, swipe-back) and verify each alternative with a
  screen reader.
- **Reduced motion everywhere:** verify every animation in the app has its fade
  version (the remaining exceptions listed in the Phase 7 notes, e.g. Activity row
  slides, are resolved).
- **Haptics are never the only signal:** every haptic has a visible counterpart.

**Decisions made while building it**

- Own small catalog (`src/i18n/`), no new dependency: `t(key, params)`, `{placeholder}` filling, plural rules written
  per language (Hermes' `Intl.PluralRules` is unreliable on iOS). Language = first device language Spendly speaks,
  read at launch. English + Arabic: Arabic proves both the second-language pipeline and right-to-left, and its six
  plural forms exercise the plural rules.
- ~410 strings moved, whole sentences per key (e.g. highlights have one key per type × current/past × week/month).
  Built-in category names are translated for display only; renaming one stores the user's text.
- Right-to-left: iOS declares `en`/`ar` (`CFBundleLocalizations`), RN mirrors the layout; fixed what mirroring can't
  reach (MorphChip position, tab bar pill direction), numbers and keypad stay left-to-right, chevrons flip on Android
  (SF Symbols mirror themselves on iOS).
- Reduced motion: the last exceptions are gone. `useLayoutTransition()` slides moving items, or cross-fades them
  with reduced motion (Activity rows, category bars, Save button, edit screen); the onboarding instruction fades
  out and back in place.
- `context/ACCESSIBILITY.md`: the test matrix, the gesture alternatives and the haptic counterparts.
- Added afterwards: **Settings → Language** (System / English / العربية). The choice is stored on its own and read
  at launch; switching restarts the app (`reloadAppAsync`) because text and layout direction are fixed per run.

**Done when**

- [ ] The full flow (add → edit → delete → undo → insights → export → backup) is completed with each item of the test matrix. *Device: `context/ACCESSIBILITY.md`.*
- [x] No string in components outside the translation catalog (enforced by lint or test). *(`noHardcodedText-test`, `catalog-test`)*
- [ ] The second language and an RTL language pass a full screenshot review. *Device (Arabic covers both).*
- [ ] Largest text size: no clipped or overlapping text on any screen of the smallest supported phone. *Device.*

---

## Phase 7 — Remove everything that doesn't earn its place

**Goal:** a smaller app that is faster to use. Every screen, setting, step and
animation has a reason a user would agree with.

**The test** (applied to everything in the app, and to every addition in Phases 1–6):

1. Does a typical user need it at least once a month, **or** does it prevent data loss?
2. If it disappeared, would anyone notice within a week?
3. Does it make the main task (logging an expense) slower, even slightly?

Keep it only if (1) or (2) is yes **and** (3) is no.

**Candidates to review (decide, then delete or keep with a written reason)**

- **Onboarding:** replace the 3-step practice screen with a one-time, inline hint on the
  real Add screen ("Drag the number up"), dismissed by doing it. No separate screen,
  no Skip button needed.
- **Settings:**
  - *Drag sensitivity* and *Amount step*: remove if Phase 2's mapping works for
    everyone; otherwise keep one.
  - *Default category*: replaced by Phase 1's smart default.
  - *Reduce motion: System / On / Off*: follow the system only, unless there is a
    real reason to differ.
  - *Sync data (Coming soon)*: a disabled button for a feature that doesn't exist;
    remove until sync is real.
- **Decorative animation:** keep motion that explains a change (an item moving, a value
  changing, something appearing where it came from); remove motion that only decorates
  (staggered entrances, bounces that delay content). Update the "everything is animated"
  rule in `CLAUDE.md` to say *changes animate, nothing animates for its own sake*, and
  cap any animation that blocks input at 200 ms.
- **Insights:** anything Phase 5 makes redundant.
- **Screens and taps:** count taps for the top 5 tasks; any task that needs a screen it
  doesn't use, or a confirmation that Undo already covers, gets shortened.

**Done when**

- [ ] Every setting, screen and animation has a keep/remove decision with a one-line reason, recorded in this file.
- [ ] Removed items are deleted from code, tests, `README.md` and `CLAUDE.md` (no dead code or hidden flags).
- [ ] Tap counts for the top 5 tasks recorded before and after; none increased.
- [ ] The app still passes the full acceptance checklist in `PHASES.md`, minus whatever was intentionally removed.
