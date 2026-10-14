# Spendly — Stage 2: new features

Stage 1 (`../PHASES.md`, `../PHASES-2.md`) built a fast, safe, accessible expense tracker. Stage 2 adds the 11
features below in **7 phases**. Each phase has a goal, where the app stands today, the work, decisions to settle
first, and **measurable done criteria**.

| # | Feature | Phase |
| --- | --- | --- |
| 11 | Theme switcher, Black & White default | 1 |
| 4 | Again (duplicate) | 2 |
| 1 | Recurring expenses | 2 |
| 9 | Income entries | 3 |
| 2 | Budgets | 3 |
| 8 | Receipt photo | 4 |
| 5 | App lock | 5 |
| 6 | Daily reminder | 5 |
| 3 | Widget and quick shortcuts | 6 |
| 10 | Monthly recap | 7 |
| 7 | Auto-backup | 7 |

**Why this order:** the new look comes first, so every later screen is built once in it. Features that change
what an expense *is* (recurrence, income, photos) come before the features that copy data elsewhere (widget,
auto-backup), so the backup file format is final before auto-backup ships. Native-heavy work is grouped
(Phases 4–7) to limit rebuilds.

---

## Ground rules (apply to every phase)

1. **Stage 1 rules still hold** (`CLAUDE.md`): no backend; integer minor units; every change animates (reduced
   motion → short fades); every string in English **and** Arabic through `t()`; shared components and tokens
   (the tokens-only and contrast tests must keep passing); `EdgeToEdge` for anything scrollable; haptics only
   through `haptics`; every drag or swipe has a button / screen-reader alternative.
2. **Data:** migrations stay append-only (v3, v4… with a test from the previous version's frozen schema). Every
   read goes through `live_expenses`. New write paths use `writeFailureMessage()` and offer Undo where it makes
   sense.
3. **Backup format:** any new stored data (recurrence, income, photos, budgets) is added to the backup file with a
   **format bump**, and `parseBackup` keeps reading older formats.
4. **Nothing silent:** no feature saves, deletes or sends anything without the user seeing it.
5. **Off by default** for anything that interrupts (lock, reminder, notifications) or reaches outside the phone
   (auto-backup).
6. **Every phase ends green:** `npx tsc --noEmit`, `npx expo lint`, `npm test`, iOS + Android bundle; device
   checks listed per phase, done by the user. New native modules mean a new development build; each phase says
   which ones it adds.
7. **Accessibility:** each phase adds its rows to `../ACCESSIBILITY.md` (flows, gesture alternatives, haptics).

### Constraints to keep in mind

- **No paid Apple developer account.** Some iOS capabilities depend on one: iCloud (definitely), App Groups for
  sharing data with a widget, and possibly Siri / App Intents. Phases 6 and 7 start by checking what a free
  account allows, and say what happens if it doesn't.
- **No backend, no network calls by the app.** Sync-like features have to use the platform (OS backup, Files,
  share sheet) unless a phase explicitly decides otherwise.

---

## Phase 1 — Theme switcher: Black & White by default

**Goal:** a distinctive monochrome look by default, without losing anything: every state still readable, the
10 category colors and the lime accent still available as **Color**.

**Today:** `theme/tokens.ts` has light/dark palettes with a lime accent and 10 category colors; Settings →
Theme is System / Light / Dark. Contrast is tested (`contrast-test.ts`); color is already never the only signal.

**Work**

- **Two settings instead of one:** *Style*: **Black & White** (default) or **Color**; *Appearance*: **System**
  (default), **Light** or **Dark**. Black & White follows the system light/dark like Color does: white background
  with black text, or black background with white text.
- **B&W palette:** pure black and white plus a few grays, defined as tokens next to the current palettes. The
  accent becomes black (or white in dark), with inverted content.
- **Categories in B&W:** no color. Icon and label as today, plus a **gray fill or pattern** per category so
  neighbouring tiles stay distinguishable. The 10 colors appear only in Color.
- **Charts in B&W:** black, gray and **hatched** fills. Today and no-data days stay distinguishable by
  **outline vs fill**, not shade alone.
- **Color style:** keeps today's palettes, plus an **accent picker with 6 accents**, each checked for contrast
  (including text on the accent) in light and dark.
- **Transitions:** switching style, appearance or accent uses the existing `ThemeFade`. Reduced motion still
  applies.
- **Migration:** existing users who chose System, Light or Dark stay on **Color** with that appearance. New
  installs start on **Black & White + System**. Done in the preferences reader with a one-time flag, tested.

**Decisions to settle first**

- Hatching: plain Views (repeated thin rotated stripes) or `react-native-svg` (new dependency). Pick by
  performance on the mid-range Android.
- The 6 accents (proposal: lime (current), blue, violet, coral, teal, amber, each tuned to pass AA).

**Decisions made while building it**

- Settings → Appearance: **Style** (Black & White / Color), **Accent** (Color only, 6 swatches, appears with a
  fade and the settings below slide), **Mode** (System / Light / Dark, the old Theme setting, for both styles).
- Black & White: pure white / black backgrounds, grays for surfaces and text, the accent is black (white in
  dark) with inverted content; success and danger are not colored (their icons and words carry the meaning).
- Categories in B&W: each color token maps to one of 5 grays (icon tint and chip fill), all ≥ 3:1 as icons and
  ≥ 4.5:1 under the chip label. The category editor hides its color picker in B&W with a note (the stored color
  is kept for Color).
- Charts in B&W: black bars, gray when dimmed, and **today's bar hatched** (the day isn't over), with a legend
  entry. No-data days stay a hollow ring, so outline vs fill still separates them. Hatching uses plain rotated
  Views, no new dependency.
- Accents (light / dark tuned separately): lime (current), blue, violet, coral, teal, amber.
- Migration: on first launch after the update, anyone with stored settings goes to **Color** with their light/dark
  choice; a fresh install gets **Black & White + System**. Decided once and stored.
- Found, not fixed: in **Color light**, the category chip's label (background color on the category color) is
  3.4–4.2:1, under 4.5:1. It predates this phase; the contrast test enforces the chip rule for B&W and Color dark,
  with a `shortcut:` note for Color light.

**Done when**

- [x] Contrast test covers B&W light/dark and all 6 accents in light/dark (text 4.5:1, UI and icons 3:1).
- [x] No component reads a raw palette color: everything goes through the theme (tokens test still passes).
- [x] Migration test: old System / Light / Dark → Color with the same appearance; fresh install → B&W + System.
- [ ] Every screen reviewed in B&W light, B&W dark, Color light, Color dark (screenshots). *Device.*
- [ ] Categories are distinguishable in B&W without color (pattern / fill + icon + label). *Device.*

---

## Phase 2 — Again and recurring expenses

**Goal:** repeat spending takes one tap, never zero: nothing is saved without the user confirming.

**Today:** Activity rows open the edit screen; Undo is one persisted slot (`undoStore`); the details panel
(`DetailsFields`) is shared by Quick Add and the edit screen.

**Work**

- **Again (duplicate):** swipe an expense in Activity → **Again**. Creates a new expense with the same category,
  amount and title, dated now, and offers Undo (`undoStore` kind `saved`). Alternatives: a screen-reader action on
  the row and an "Again" button on the edit screen.
- **Recurring:** details panel → **Repeat**: none, daily, weekly, monthly, yearly. Stored as a recurrence rule
  (migration v3: a `recurrences` table with template fields, rule, next due date, active flag).
- **Due items:** when a recurrence is due, Activity shows a **pending row** at the top of its day: same look as an
  expense but clearly marked pending, with **Confirm** (saves a real expense, dated the due date) and **Skip**.
  Never saved silently, so totals and Insights only count confirmed expenses.
- **Edge cases:** monthly on the 29th–31st in short months (use the last day), DST, a phone left closed for weeks
  (show each missed occurrence, with "Confirm all" / "Skip all" when there are several), editing or stopping a
  rule from the edit screen.
- Recurrences go into the backup file (format bump).

**Decisions to settle first**

- Swipe direction and how swipe coexists with the list's scroll and the back gesture (see Stage 1 gesture rules).
- Missed occurrences: how far back to show them (proposal: last 3 months).

**Decisions made while building it**

- Swipe: an expense row swipes to reveal **Again** (tap it; no full-swipe trigger, so a scroll can't add an expense
  by accident). Alternatives: the screen-reader action on the row and an **Again** button on the edit screen.
  Again copies category, amount, title and currency, dated now.
- Rules: `recurrences` (template copied from the expense, anchored at its date and time) and
  `recurrence_occurrences` (confirmed / skipped, one row per occurrence; the primary key rejects a double tap).
  Occurrence n is computed from the anchor, so months ending on the 31st clamp and come back.
- Pending: due, unhandled occurrences from the last 3 months (same date 3 months back); older ones are simply no
  longer offered, nothing is saved for them. Hidden while searching by text; the category filter applies.
- Pending row: dashed outline, repeat icon, "Due {day} · {frequency}", quieter amount; Confirm and Skip on the
  row; tapping it lists Confirm / Skip / Stop repeating. Confirm all / Skip all appear when 2 or more are due,
  after a confirmation with the count (no Undo for a batch; each item is its own transaction).
- Repeat lives in the shared details panel (Quick Add and edit screen). Quick Add saves the expense and its rule in
  one transaction. On the edit screen, a new choice starts a new rule from that expense; "Doesn't repeat" stops it.
  The rule's template is fixed when it starts (editing one occurrence doesn't change later ones).
- Undo: `confirmed` (removes the expense, makes it due again), `skipped` (makes it due again), and undoing a save
  that started a repeat stops it.
- Backup format 2 adds rules and occurrences; format 1 files still restore.

**Done when**

- [x] Recurrence date math is a pure, tested function: month ends, leap years, DST, long gaps.
- [x] Pending rows never count in totals, highlights or exports until confirmed (tests).
- [ ] Again + Undo, Confirm + Undo, Skip all work with a screen reader and without swiping. *Device.*
- [x] Migration v3 tested from a frozen v2 database; backup round-trip includes recurrences.

---

## Phase 3 — Income entries and budgets

**Goal:** see what's left, quietly: income and limits appear only for people who use them, and never as popups.

**Today:** every entry is an expense; Insights shows totals, highlights, chart and categories per currency.

**Work**

- **Income:** details panel → toggle **Expense / Income** (migration v4: a `kind` column, default `expense`).
  Income entries appear in Activity (clearly marked, e.g. "+" and a label, not just color) and never inflate
  spending totals, highlights or budgets.
- **Net:** Insights shows **Net** (income − expenses) for the period **only if** income exists in it. Otherwise
  Insights is exactly as today.
- **Budgets:** Settings → **Budget**: one overall monthly amount, plus optional per-category amounts, in the
  current currency.
- **Budget display:** only in Insights, as a **thin progress bar with words** ("€120 left", "€30 over"). No
  popups, no notifications. Per-category budgets show on their category rows.
- Income and budgets go into the backup file (format bump); CSV gets a type column.

**Decisions (settled)**

- Budgets are for the main currency only, monthly, shown only in month view when that currency is shown.
- No special "Income" category: income uses the existing and custom categories, so the grid is unchanged for
  people who never log income.

**Built**

- `kind` on expenses and recurrences (migration v4) plus a `live_spending` view; every spending total, highlight,
  baseline, suggestion and day total reads it. Net = `incomeTotal` − spending, shown only when income > 0.
- Activity: income rows show "+" and the word "Income"; day totals leave income out.
- Wording: current month "€120 left of €500" / "€30 over €500"; past months "€120 under budget" / "€30 over budget".
- CSV: a last **Type** column. Backups are format 3 (still read 1 and 2); the budget travels in the settings.

**Done when**

- [x] Totals, highlights and the baseline exclude income (tests on seeded data).
- [x] Net and budget numbers match hand-calculated values (tests), including partial months and DST.
- [x] A user who never adds income or a budget sees no change anywhere (Net and budget UI render only when used).
- [ ] Budget bars read correctly with VoiceOver / TalkBack ("€120 left of €500"). *Device.*

---

## Phase 4 — Receipt photo

**Goal:** keep the proof with the expense, on the phone only.

**Today:** expenses have text details only; backup is a JSON file.

**Work**

- Details panel → **Add photo**: camera or gallery (`expo-image-picker`), shown as a thumbnail; tap for full
  screen; remove with Undo.
- Stored in the app's document directory (not the cache), resized and compressed (e.g. longest side 2000 px,
  JPEG) to keep size reasonable; the database keeps only the file name (migration v5).
- Deleting an expense keeps its photo until the 30-day purge; the purge removes orphaned photo files too.
- **Backups include photos.** Decide the container: JSON with embedded images (simple, large) or a folder / zip
  (smaller, needs a zip library). Restore checks every photo before writing anything, as today.
- Permissions: camera and photo library prompts with clear, translated explanations (`app.json`).

**Decisions to settle first**

- Backup container for photos (see above), and a size warning when backups get large.

**Done when**

- [ ] Add / replace / remove a photo, with Undo; photo survives restart and edits. *Device.*
- [ ] Purge removes orphaned files (test with a temp directory); no photo is ever lost while its expense exists.
- [ ] Backup → restore on another phone brings photos back; damaged or missing photo files reject the restore
      cleanly (tests for the parser).
- New native module: `expo-image-picker` (new build).

---

## Phase 5 — App lock and daily reminder

**Goal:** privacy and a gentle habit nudge, both opt-in.

**Today:** no lock; no notifications.

**Work**

- **App lock:** Settings → **Security**: Face ID, fingerprint or device passcode (`expo-local-authentication`).
  **Off by default.** When on, the app locks when it goes to the background (and on cold start) and shows a
  privacy cover in the app switcher. If biometrics fail or are removed, fall back to the device passcode; never
  lock the user out of their data.
- **Daily reminder:** Settings → **Reminder**: a local notification at a time you pick
  (`expo-notifications`, local only). **Off by default.** **Skipped if you already logged something that day**:
  schedule a day at a time, and cancel today's when an expense is saved. Tapping it opens Add.
- Notification permission is asked only when the user turns the reminder on, with a translated explanation.

**Decisions to settle first**

- Lock grace period (proposal: lock immediately; optional 1 minute).
- How "skipped if you logged" works when the app hasn't run that day (proposal: the reminder fires unless an
  expense was saved; the next day is rescheduled at each launch and save).

**Done when**

- [ ] Lock: on/off, background → foreground, cold start, failed biometrics, biometrics removed. *Device.*
- [ ] Reminder: fires at the chosen time, not after a save that day, survives restart and timezone change. *Device.*
- [ ] Scheduling logic is a pure, tested function (which day to schedule next, given saves and the time).
- New native modules: `expo-local-authentication`, `expo-notifications` (new build).

---

## Phase 6 — Widget and quick shortcuts

**Goal:** see today and log something without opening the app first.

**Today:** the app opens straight onto Add; everything lives inside the app.

**Work**

- **Home-screen widget:** today's total (per currency, like the Add screen header); tap opens Add. iOS
  (WidgetKit extension) and Android (app widget), added through config plugins, never by editing `ios/` or
  `android/` by hand.
- The app writes a small snapshot (today's totals, date) to storage the widget can read after each save, undo
  and at midnight.
- **Shortcuts:** iOS Shortcuts / Siri and an Android quick settings tile: **"Log 20 Food"** saves an expense
  without opening the app and confirms it (spoken / notification) with a way to undo in the app.
- Deep links (`spendly://add`, with amount and category) back both the widget and the shortcuts.

**Decisions to settle first**

- **Free Apple account check:** widgets need data shared through an App Group; confirm a free-account sideloaded
  build can use one. If not: ship the Android widget and tile, and the iOS deep-link shortcuts only.
- Which config plugin / library for widget targets (must work with Expo SDK 57).

**Done when**

- [ ] Widget shows the right total after save, undo, edit, delete and at midnight. *Device.*
- [ ] "Log 20 Food" works from Siri / Shortcuts and the Android tile, and the expense appears in Activity with
      Undo available. *Device.*
- [ ] Deep-link parsing is a pure, tested function (amount, currency, category name in English or Arabic).

---

## Phase 7 — Monthly recap and auto-backup

**Goal:** a moment of reflection each month, and backups that happen by themselves.

**Today:** Insights has highlights; backup is manual through the share sheet.

**Work**

- **Monthly recap:** on the 1st (and for the first days of the month), Insights shows a **recap card** for the
  month that ended: total, top category, biggest day, change vs. usual (reusing the highlight rules). **Share**
  exports the card as an image (`react-native-view-shot` + share sheet). Dismissible; past recaps reachable by
  stepping back a month.
- **Auto-backup:** Settings → Data → **Auto-backup**, weekly, **off by default**. Same file format and checks as
  manual backup (now final: recurrence, income, budgets, photos). Manual backup stays available. Shows the last
  backup date and any failure.
- **Where it goes (decide first):** iCloud needs a paid Apple account and Google Drive needs network sign-in;
  both clash with Stage 1's rules. Proposal: on Android use the system's **Auto Backup** to Google Drive (the OS
  uploads the app's backup file; Spendly makes no network call); on iOS write the weekly file to the app's
  **Files** folder ("On My iPhone → Spendly"), which iCloud device backup covers, and add iCloud Drive later if
  a paid account exists.

**Decisions to settle first**

- Auto-backup destination per platform (above). How many weekly files to keep (proposal: the last 4).

**Done when**

- [ ] Recap numbers match hand-calculated values (tests), including months with DST changes and no-data days.
- [ ] Recap image renders in every theme (B&W / Color, light / dark) and in Arabic. *Device.*
- [ ] Auto-backup runs weekly without opening the app every day (as far as the OS allows), keeps the last N files,
      and a file restores on another phone. *Device.*
- New native modules: `react-native-view-shot`, possibly a background-task module (new build).

---

## After Stage 2

- `README.md`, `CLAUDE.md` and `../ACCESSIBILITY.md` describe every new feature, and the Arabic catalog is
  complete (`catalog-test`).
- The Stage 1 acceptance checklist still passes, plus each phase's device checks above.
