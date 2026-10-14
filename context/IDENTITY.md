# Spendly --- Product, Design & Animation Blueprint

> **Product principle:** Record an expense in seconds. The interface
> should feel like one fluid gesture, not a financial form.
>
> **Platform:** React Native CLI (bare React Native; not Expo)
>
> **Primary objective:** Make expense capture exceptionally fast,
> tactile, and satisfying. Morphing transitions and gesture-driven
> motion are core product functionality---not decorative polish.
>
> **Animation rule:** Everything in Spendly is animated. Every visible
> change---no matter how small---transitions instead of snapping. An
> instant visual state change is treated as a bug.

> **Where the built app differs from this blueprint** (decided in `PHASES.md` /
> `PHASES-2.md`; the rest of this document still describes the product):
>
> - **Expo, not bare React Native** (Expo Router, `expo-sqlite`, `expo-haptics`…);
>   preferences live in `expo-sqlite/kv-store` instead of MMKV.
> - **Numbers use Space Grotesk** (embedded font, rolling per-digit animation);
>   all other text uses the system font as specified here.
> - **Default category:** no None / Last used setting; a habitual category for the
>   time of day is preselected when the habit is clear.
> - **Amount drag:** speed-aware (exact single steps when slow, acceleration only
>   when fast), with amount suggestions per category.
> - **Languages:** English and Arabic (right-to-left), following the phone or chosen
>   in Settings.
> - **Data safety:** deleted expenses are recoverable for 30 days, Undo survives a
>   restart, and backup / restore to a file exists (still no backend).
> - **Insights:** plain-language highlights against your usual spending lead the
>   screen.

---

## 1. Product identity

### Name

**Spendly**

### One-line description

**Your spending, captured in a swipe.**

### Product promise

Open the app, tap a category, drag to the amount, release, and you're
done. Adding details is optional and never blocks the quick path.

### Target user

Someone who wants to keep a lightweight record of everyday spending
without managing a complicated budget spreadsheet or navigating a
multi-step form.

### Product principles

1.  **Capture first.** The primary screen is the expense composer, not a
    dashboard.
2.  **One continuous interaction.** Category, amount, and save should
    feel like stages of the same surface.
3.  **Optional complexity.** Merchant, notes, date, and payment method
    stay hidden unless requested.
4.  **Motion communicates state.** Morphing, position, scale, and
    haptics make state changes legible. Every state change animates,
    including the smallest ones.
5.  **Never sacrifice clarity for spectacle.** Amount and currency must
    always be readable; gestures must have visible affordances and
    accessible alternatives.
6.  **Local-first reliability.** Saving an expense should work offline
    and feel instant.
7.  **Quiet finance.** No guilt language, gamified shame, noisy charts,
    or unnecessary notifications.

### What Spendly is not

- Not a full accounting suite.
- Not a bank aggregator.
- Not a social finance app.
- Not a receipt-scanning app in the MVP.
- Not a budgeting product that forces users to configure categories
  and limits before recording an expense.

---

## 2. Signature interaction: tap + drag

This is the defining Spendly experience. Every other feature supports
it.

### The happy path

1.  User opens Spendly.
2.  The **Quick Add surface** is immediately ready; no landing screen or
    mandatory dashboard detour.
3.  User taps a category tile, such as **Food**.
4.  The selected tile morphs into the active expense surface. Other
    categories move aside or fade, while the amount control becomes the
    focus.
5.  User drags vertically on the amount surface to adjust the value. The
    amount changes continuously and immediately.
6.  User releases. The amount settles to a sensible increment and a
    clear **Save** action appears---or the interface offers a short,
    explicit save confirmation step if needed.
7.  A short confirmation animation acknowledges the saved expense. The
    composer resets and is ready for the next expense.

**Important:** A drag must not silently save an expense. The user must
explicitly commit it by tapping Save or using a clearly documented
release-to-confirm interaction with an undo window. For the MVP, use a
visible Save action after the drag; this is safer and still fast.

### Quick Add layout

The main screen is a single composition, not a form divided into
conventional fields.

- **Top:** compact date context and history/profile access.
- **Center:** large amount display and drag surface.
- **Bottom / surrounding area:** category tiles or a compact category
  wheel/grid.
- **Optional details affordance:** a small `+ Details` control.
- **Commit action:** clear Save button that becomes prominent after
  category and amount are valid.

The precise layout can adapt to screen size, but the amount and category
must remain the two strongest visual elements.

### Category selection

- Start with a curated set of common categories:
  - Food
  - Transport
  - Groceries
  - Shopping
  - Bills
  - Health
  - Entertainment
  - Home
  - Travel
  - Other
- Each category has an icon, label, and semantic color token.
- Tap selects a category; a long press may open category management,
  but do not make long press necessary for basic use.
- The selected category should visually become part of the amount
  composer via a shared-element/morphing transition.
- Keep a visible selected state; never rely on color alone.
- Allow the user to reorder, hide, and add categories later, outside
  the quick-entry path.

### Drag-to-amount interaction

Use a dedicated gesture surface around the amount display.

- **Default amount:** start at `0` or the user's last-used increment,
  but never prefill an amount that could accidentally be saved.
- **Direction:** vertical drag is the recommended default because it
  is easy to explain and works with a centered amount display.
- **Sensitivity:** use a configurable nonlinear scale:
  - Small movements near zero make fine adjustments.
  - Longer drags cover larger amounts more quickly.
  - A modifier zone or second gesture can adjust the step size, but
    do not require it for the MVP.
- **Snapping:** configurable increments, for example 1, 5, 10, or 50
  currency units depending on the amount range and currency. Avoid
  assuming all currencies use the same scale.
- **Visual feedback:** amount digits update live; subtle scale or tick
  feedback can indicate each increment; use restrained haptics at
  meaningful thresholds.
- **Cancel:** dragging back to the initial state or using a clear
  reset control returns to zero.
- **Accessibility alternative:** the amount can also be entered
  through a standard numeric keypad, with VoiceOver/TalkBack labels
  and buttons for increment/decrement. Dragging cannot be the only way
  to set the amount.
- **Avoid accidental navigation:** gesture ownership must be explicit
  so amount dragging does not fight scroll, swipe-to-dismiss, or
  category gestures.

### Details are optional

`+ Details` expands an inline panel or morphs into a compact details
sheet. It must not push the user into a separate required workflow.

Optional fields: - Merchant / title - Note - Date and time (default to
now) - Payment method (optional) - Receipt attachment (future scope, not
MVP)

The details panel should animate open in the same visual space,
preserving the category and amount. Closing it must retain any entered
values.

### Saving and undo

- Save should be immediate and local-first.
- After save, show a brief confirmation state and a visible **Undo**
  affordance.
- Reset the composer only after the save has succeeded locally.
- If persistence fails, preserve the draft and display a recoverable
  error.
- Prevent duplicate saves caused by rapid taps or animation callbacks.
- Saving must never depend on a network request.

---

## 3. Visual identity

### Brand personality

- Minimal
- Tactile
- Calm
- Precise
- Slightly playful through motion, not through clutter
- Premium without looking like a bank's enterprise dashboard

### Design direction

Use a **warm neutral canvas with deep ink typography and a vivid
mint/acid-lime accent**. The interface should feel like a physical
object with soft, responsive surfaces, not a generic spreadsheet. Use
rounded geometry selectively and strong typographic hierarchy.

Avoid excessive glassmorphism, heavy gradients, floating cards
everywhere, or blurred surfaces that reduce contrast. Motion---not
visual effects---should make Spendly distinctive.

### Color palette

Use semantic design tokens. Do not scatter raw hex values across
components.

Token Hex Usage

---

`background` `#F6F5F0` Main warm canvas
`surface` `#FFFFFF` Primary composer and sheets
`surfaceSecondary` `#ECECE5` Inactive tiles and subtle panels
`textPrimary` `#171914` Main text and amount
`textSecondary` `#6D7067` Supporting text
`borderSubtle` `#E0E1D8` Hairlines and dividers
`accent` `#C8F169` Primary action and selected accent
`accentPressed` `#B2DC54` Pressed accent state
`success` `#267A4B` Saved confirmation
`danger` `#C43D37` Destructive actions and errors
`overlay` `#17191466` Modal scrim

The accent is a highlight, not a background for every component. Use
dark text on the lime accent to maintain legibility.

### Dark theme

Support a deliberate dark theme, not an inverted light theme.

Token Hex Usage

---

`background` `#11130F` Main canvas
`surface` `#1B1E18` Main composer
`surfaceSecondary` `#272B23` Secondary controls
`textPrimary` `#F3F4EC` Main text
`textSecondary` `#A5AA9B` Supporting text
`borderSubtle` `#34392F` Dividers
`accent` `#C8F169` Primary accent
`accentPressed` `#B2DC54` Pressed state
`success` `#7AD9A0` Confirmation
`danger` `#FF817A` Errors and destructive actions

Respect the system theme by default and allow a manual override in
Settings.

### Category color system

Use muted, distinguishable colors and pair each with an icon and label.
Category color is a recognition aid, not the only indicator of
selection.

Suggested mapping: - Food --- coral - Transport --- blue - Groceries ---
green - Shopping --- violet - Bills --- amber - Health --- teal -
Entertainment --- pink - Home --- slate - Travel --- sky - Other ---
neutral

Keep category colors in a separate token map so they can be tuned
centrally. Check contrast in both themes.

### Typography

- Use the platform system font for performance and native feel.
- Amount: large tabular numerals, medium/semibold weight, tight but
  readable tracking.
- Screen title: semibold, compact.
- Category labels: medium weight, short labels.
- Metadata: regular weight, secondary color.
- Use tabular numerals where supported so amount changes do not cause
  distracting horizontal layout shifts.
- Currency symbol/position must follow locale rules; do not hard-code
  `$` or assume symbol placement.

### Shape, spacing, and surfaces

- Use a consistent spacing scale, e.g. 4 / 8 / 12 / 16 / 24 / 32.
- Primary composer: large radius, stable silhouette.
- Category tiles: rounded rectangles or soft circles; choose one
  consistent system.
- Avoid tiny tap targets. Target at least 44 pt on iOS and 48 dp on
  Android where practical.
- Use subtle borders and restrained shadows. Avoid large elevation
  stacks.
- Respect safe areas, dynamic type, keyboard insets, and smaller
  devices.

### Iconography

Use one consistent outline icon family. Icons must have text labels in
category selection. Use vector icons and avoid emoji as production
category icons.

---

## 4. Animation is a core system

Animation is not a finishing pass. It is a first-class layer with
reusable primitives, shared timing rules, gesture-linked values, and
explicit state transitions.

### Everything animates

This is a hard rule, not a guideline. **Every visible change in the UI
animates**, including the ones that seem too small to matter. Nothing
appears, disappears, or changes appearance in a single frame.

This explicitly includes:

- **Bottom tab bar:** the selected-tab indicator slides between tabs;
  icons and labels animate their color, opacity, and scale on focus;
  tabs respond to press with a tactile scale.
- **Switching tabs:** tab content transitions (slide + fade), never a
  hard cut.
- **Press states** on every pressable: buttons, rows, tiles, icons.
- **Color, border, and opacity changes:** selected, disabled, focused,
  error, and theme-dependent states interpolate rather than swap.
- **Content entering and leaving:** screens, sections, empty states,
  sheets, toasts, banners, errors, and Undo affordances.
- **List changes:** inserted, removed, and reordered rows animate
  their layout.
- **Value changes:** amounts, totals, counters, and dates transition
  when they update.
- **Navigation:** pushes, pops, modals, and sheets.
- **Keyboard** appearance and dismissal, and the layout that follows it.
- **Theme changes** between light and dark.

Rules that still apply:

- Animations stay short, interruptible, and never block input or
  saving (see Motion principles).
- **Reduced motion does not mean no animation.** When reduced motion
  is on, remove movement and scale and replace them with short fades or
  color transitions---the change is still animated, just calmer.
- No perpetual idle animation; "everything animates" applies to
  changes, not to things standing still.

### Animation goals

- Make state changes feel continuous.
- Preserve object identity when a category becomes the active expense.
- Make gestures direct-manipulation interactions: the UI follows the
  finger.
- Keep motion short, interruptible, and physically plausible.
- Maintain 60 fps as the baseline and target 120 Hz on supported
  devices where feasible.
- Never delay saving or block interaction just to finish an animation.

### Signature morph sequence

**State A --- Ready** - Category tiles are visible and the amount
surface is idle. - The primary surface has a calm, low-motion idle
state. Avoid perpetual animation that drains battery or distracts.

**State B --- Category selected** - The tapped category scales subtly
and lifts from the grid. - Its background expands or morphs into the
active category indicator. - The other tiles compress, move, or fade
with a short stagger. - The amount display becomes visually dominant. -
The selected category's icon and label transition without a hard cut
where practical.

**State C --- Amount dragging** - The amount follows the gesture
directly on the UI thread. - Digits update with a short, controlled
transition; avoid animating every digit with a full-screen layout
reflow. - A subtle scale response can communicate increasing
magnitude. - Threshold haptics should be sparse and intentional.

**State D --- Ready to save** - Save action enters with a small
opacity/translation or width expansion. - Category and amount remain
anchored; the entire screen should not jump. - Details remains a
secondary action.

**State E --- Saved** - Save control compresses briefly and releases. -
A small success mark or confirmation replaces the save affordance. - The
amount may transition into a compact recent-expense row or settle back
into the ready state. - Undo appears without blocking the next entry.

**State F --- Next expense** - Composer resets with a reverse morph or
shared-element transition. - The previous category may remain selected
as a speed optimization, but this must be a deliberate preference and
easy to change. - The next entry can begin immediately; no mandatory
success modal.

### Motion principles

- Prefer transform and opacity animations over repeated layout
  recalculation.
- Use spring motion for tactile surfaces and gesture release; use
  timed easing for fades and small confirmations.
- Keep overshoot subtle. No bouncy toy-like motion for financial data.
- Use stagger only when it helps establish hierarchy; never make users
  wait for each tile to animate before interacting.
- Animations must be interruptible and reversible where sensible.
- Use reduced-motion settings to replace large morphs with short fades
  or immediate state changes.
- Respect Android and iOS interaction expectations.

### Motion tokens

Centralize animation parameters and tune them on-device.

Token Initial guidance Use

---

`micro` 100--160 ms Press feedback, tiny opacity changes
`quick` 160--220 ms Tile selection, compact state changes
`standard` 220--320 ms Sheet expansion, content transitions
`morph` 300--450 ms Signature category-to-composer transition
`settle` Spring, low bounce Drag release and surface settling
`stagger` 20--40 ms between items Small category-grid transitions

These are starting ranges, not rigid requirements. Tune with actual
devices and gesture tests. Avoid stacking multiple independent springs
on the same visual property.

### Haptics and sound

- Optional, subtle haptic at category selection, meaningful amount
  increments, and successful save.
- Haptics must not fire on every pixel of a drag.
- Add a Settings toggle for haptics.
- No sound by default. If sound is ever added, it must be optional and
  quiet.

---

## 5. Pages and navigation

Keep the app deliberately small. The default route is Quick Add.
Navigation should not turn this into a multi-tab finance suite.

### Primary navigation

Use a minimal bottom navigation or similarly unobtrusive switcher with
three destinations: 1. **Add** --- default and primary. 2. **Activity**
--- expense history. 3. **Insights** --- simple summaries.

The bottom tab bar is **animated**: a selection pill slides to the
active tab, the active icon and label animate in (color, opacity,
subtle scale), and pressing a tab gives tactile press feedback.
Switching tabs animates the content with a short slide + fade (fade only
under reduced motion). See "Everything animates" in section 4.

Settings is reached from a small top-level control, not a fourth equally
prominent destination. If testing shows bottom navigation distracts from
capture, replace it with compact top-level transitions; do not
compromise the Quick Add experience to preserve a conventional tab bar.

### Page 1 --- Quick Add (Home)

**Purpose:** Capture an expense as fast as possible.

**Elements** - Date context, defaults to Today. - Amount drag surface
and large amount display. - Category picker. - `+ Details` affordance. -
Save action. - Small Activity/history shortcut. - Optional current-day
total in low visual priority.

**States** - Idle / no category selected. - Category selected. - Amount
being adjusted. - Ready to save. - Details expanded. - Saving. - Saved
with Undo. - Recoverable error. - Empty / first-use onboarding hint.

**Rules** - This is the initial screen on app launch. - Do not show a
dashboard before it. - Keep category and amount visible without
scrolling on common phone sizes. - Save is disabled until category and
amount are valid. - No category or amount should be silently assumed if
that could lead to a wrong entry.

### Page 2 --- Category Picker / Manage Categories

**Purpose:** Fast category selection during entry; management is a
secondary mode.

**Quick-entry mode** - Compact grid or wheel of common categories. -
Single tap selects. - Selection morphs into the active composer state. -
Recent/frequent categories can be prioritized, but don't reorder
unexpectedly during a gesture.

**Management mode** - Reorder categories. - Show/hide categories. - Add
custom category. - Rename category and select an icon/color. - Restore
defaults.

Do not force the user into category management during normal entry.

### Page 3 --- Optional Details

**Purpose:** Add context without slowing down a basic expense.

This should preferably be an inline expansion or bottom sheet, not a
full-screen page.

**Fields** - Merchant / title. - Note. - Date/time. - Payment method
(optional).

**Rules** - Category and amount remain visible. - Closing details
retains entered values. - Empty optional fields are not stored as noisy
empty strings. - Keyboard appearance and dismissal must be animated
without layout jumps. - Saving can happen with no details at all.

### Page 4 --- Activity

**Purpose:** Review and correct recent expenses.

**Elements** - Chronological list grouped by day. - Each row: category
icon, merchant/title or category, time, amount. - Today's total and
selected date summary. - Search/filter affordance, kept compact. - Undo
/ edit / delete actions.

**Interactions** - Tap a row to open expense details/edit. - Swipe
actions are optional; never make swipe the only way to edit or delete. -
Pull-to-refresh is unnecessary for local data; do not add it unless
remote sync is implemented. - List should remain smooth with long
histories.

**Empty state** - A concise message and a single action that returns to
Quick Add.

### Page 5 --- Expense Details / Edit

**Purpose:** Correct an existing record without rebuilding the whole app
around forms.

**Elements** - Amount. - Category. - Merchant/title and note. -
Date/time. - Payment method if present. - Save changes and Delete.

**Motion** - Activity row may expand into the details surface with a
shared-element-like transition where technically reliable. - Preserve
context when returning to Activity. - Use a confirmation for destructive
deletion and provide undo where practical.

### Page 6 --- Insights

**Purpose:** Give useful feedback without becoming a complicated
budgeting app.

**MVP contents** - Total spent this week/month. - Comparison with
previous period. - Spending by category. - Daily/weekly trend. - Most
frequent category.

**Rules** - Use simple, readable charts and short labels. - No complex
forecasting, investment advice, or bank connection. - Clearly
distinguish zero spending from missing data. - Period and currency
follow user settings.

### Page 7 --- Settings

**Purpose:** Configure the app without cluttering the entry flow.

**Sections** - Currency and locale. - Theme: System / Light / Dark. -
Haptics on/off. - Reduced motion: follow system / on / off, if
supported. - Default date behavior. - Default category behavior: none /
last used. - Amount drag sensitivity and increments. - Category
management. - Data export. - Privacy and app information.

Keep settings sparse. Avoid account creation as a prerequisite for using
the app.

### Page 8 --- First-use onboarding

**Purpose:** Teach the signature gesture in a few seconds.

Keep it to one short, skippable interactive introduction: 1. Tap a
category. 2. Drag to set an amount. 3. Tap Save.

Use a playable miniature interaction rather than a carousel of marketing
slides. The user can skip onboarding and start immediately. Never
require registration before recording the first expense.

### Page 9 --- Export / Data

This may be a settings subpage rather than a main destination.

**MVP** - Export expenses to CSV. - Show date range and fields
included. - Share/export using the native share sheet. - Explain where
exported data goes.

Do not build a complex report builder in the first release.

### Page count

The MVP has **8--9 logical pages or surfaces**, depending on whether
Category Picker, Details, and Export are implemented as sheets/overlays
instead of full pages. That is intentional: depth comes from the
interaction quality, not a large page count.

---

## 6. MVP scope

### Must ship

- Fast Quick Add flow.
- Category selection.
- Drag-to-adjust amount.
- Numeric keypad alternative.
- Optional details.
- Local persistence.
- Activity list.
- Edit and delete.
- Undo after save/delete where feasible.
- Basic Insights.
- Currency/locale handling.
- Light and dark themes.
- Haptic toggle and reduced-motion support.
- CSV export.
- Offline operation.
- Accessible controls and screen-reader labels.
- Reliable handling of interrupted gestures and app backgrounding.

### Explicitly out of scope for v1

- Bank account linking.
- Cloud accounts and multi-device sync.
- AI categorization.
- Receipt OCR.
- Shared household budgets.
- Complex budget envelopes and alerts.
- Subscription detection.
- Currency conversion using live exchange rates.
- Social features.
- Complicated onboarding.
- Ads.

Build a clean local-first data layer so sync can be added later, but do
not implement speculative sync infrastructure in the MVP.

---

## 7. Information architecture and data model

### Expense

```ts
type Expense = {
  id: string;
  amountMinor: number; // Integer in the currency's minor unit where applicable
  currencyCode: string; // ISO 4217, e.g. "MAD", "EUR", "USD"
  categoryId: string;
  title?: string;
  note?: string;
  occurredAt: string; // ISO 8601
  paymentMethod?: PaymentMethod;
  createdAt: string;
  updatedAt: string;
};

type PaymentMethod = "cash" | "card" | "transfer" | "other";
```

Use integer minor units where the currency supports them; do not store
money as floating-point numbers. Currency exponent varies, so do not
assume every currency has two decimal places. Define formatting and
parsing through locale-aware utilities.

### Category

```ts
type ExpenseCategory = {
  id: string;
  name: string;
  icon: string; // Stable icon key, not a rendered component
  colorToken: string;
  isBuiltIn: boolean;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
};
```

### User preferences

```ts
type AppPreferences = {
  currencyCode: string;
  theme: "system" | "light" | "dark";
  hapticsEnabled: boolean;
  reducedMotion: "system" | "on" | "off";
  defaultCategoryMode: "none" | "lastUsed";
  lastUsedCategoryId?: string;
  dragSensitivity: "precise" | "balanced" | "fast";
  amountIncrement: "1" | "5" | "10" | "50";
};
```

The increment options above are examples. Make them currency-aware and
allow the internal model to support arbitrary valid increments.

### Persistence

- Use a local database or robust key-value persistence with a clear
  repository boundary.
- Expenses are structured, queryable records; prefer SQLite for
  durable transaction history and aggregation.
- Keep UI state, draft state, and persisted data separate.
- Store preferences separately from the expense ledger.
- Use schema migrations from the first release.
- Saving an expense should be atomic and idempotent from the UI's
  perspective.
- Never let an animation callback be the sole source of truth for
  whether a record was saved.

---

## 8. Animation-first technical architecture

### Recommended stack

Use a bare React Native CLI project. Do not use Expo as the project
foundation.

- **React Native + TypeScript:** application and UI.
- **React Native Reanimated:** shared values, UI-thread animations,
  derived values, entering/exiting transitions, animated styles.
- **React Native Gesture Handler:** pan, tap, long-press, gesture
  composition, gesture arbitration.
- **React Native Skia:** optional, reserved for genuinely custom
  animated graphics or chart rendering. Do not use it to render every
  ordinary control.
- **React Native SVG:** icons and simple vector shapes where
  appropriate.
- **React Navigation:** minimal navigation between Add, Activity, and
  Insights.
- **SQLite-backed storage:** durable local expense history and
  aggregate queries.
- **MMKV or equivalent:** lightweight preferences and non-ledger local
  state, if useful.
- **Safe area support:** handle insets correctly.
- **Haptics library:** optional tactile feedback behind a small
  adapter interface.

Choose compatible, maintained versions after checking the exact React
Native version and native dependency constraints. Do not install every
animation library speculatively.

### Architectural rule

**Business logic must not depend on animation state.** The
gesture/animation layer can emit a committed intent, but persistence and
domain rules live outside the animation system.

A spring finishing does not mean an expense has been saved. A cancelled
gesture must not create a record. A navigation transition must not lose
a draft.

### Suggested folder structure

```text
src/
  app/
    navigation/
    providers/
    theme/
    config/
  features/
    quick-add/
      components/
        AmountSurface/
          index.tsx
          styles.ts
        CategoryGrid/
          index.tsx
          styles.ts
        CategoryTile/
          index.tsx
          styles.ts
        SaveAction/
          index.tsx
          styles.ts
        DetailsPanel/
          index.tsx
          styles.ts
      hooks/
        useExpenseDraft.ts
        useAmountDrag.ts
        useQuickAddMotion.ts
      state/
        quickAddReducer.ts
        quickAddTypes.ts
      utils/
        amountScale.ts
        dragMapping.ts
      screens/
        QuickAddScreen/
          index.tsx
          styles.ts
    activity/
      screens/
      components/
      hooks/
    expense-details/
      screens/
      components/
    insights/
      screens/
      components/
    settings/
      screens/
      components/
    categories/
      screens/
      components/
  components/
    Button/
    Icon/
    Screen/
    BottomSheet/
    AmountText/
    EmptyState/
  animation/
    tokens.ts
    springs.ts
    transitions.ts
    sharedValues.ts
    reducedMotion.ts
  domain/
    expense/
      expense.types.ts
      expense.validation.ts
      expense.service.ts
      expense.repository.ts
    category/
      category.types.ts
      category.service.ts
      category.repository.ts
    money/
      money.types.ts
      money.format.ts
      money.parse.ts
  storage/
    database/
      migrations/
      connection.ts
    preferences/
  haptics/
    haptics.types.ts
    haptics.service.ts
  utils/
    dates.ts
    ids.ts
    result.ts
```

Follow the existing project conventions if implementing into an existing
repository. Keep component files small and consistent; use `index.tsx`
plus `styles.ts` for components where that matches the codebase.
Centralize design tokens and avoid raw, scattered style values.

### State ownership

Separate state into four categories:

1.  **Domain state:** persisted expenses, categories, preferences.
2.  **Draft state:** selected category, current amount, optional
    details, dirty/valid status.
3.  **Gesture/animation state:** drag offset, progress, active morph
    progress, animated scale/opacity/position.
4.  **Navigation state:** current route and overlay/sheet presentation.

Use React state or a small reducer for the expense draft. Use Reanimated
shared values for continuous gesture data and frame-by-frame animation.
Do not send every drag update through React state; that creates
unnecessary rerenders and can make the interaction feel sluggish.

### Quick Add state machine

Represent the flow explicitly rather than scattering booleans across
components.

```ts
type QuickAddPhase =
  | "ready"
  | "categorySelected"
  | "adjustingAmount"
  | "readyToSave"
  | "showingDetails"
  | "saving"
  | "saved"
  | "error";
```

Keep the selected category, amount, and details as draft data
independent of the phase. Define allowed transitions and reset/cancel
behavior centrally.

Example flow:

```text
ready
  -> categorySelected
  -> adjustingAmount
  -> readyToSave
  -> saving
  -> saved
  -> ready

categorySelected / readyToSave
  -> showingDetails
  -> previous valid phase

saving
  -> error (preserve draft)
  -> saved (show Undo)
```

The UI can animate between phases, but phase changes must be driven by
explicit events and validated transitions.

---

## 9. Gesture and animation implementation strategy

### Gesture pipeline

1.  Gesture Handler detects tap/pan and arbitrates against parent
    scroll/navigation gestures.
2.  Reanimated shared values update continuously on the UI thread.
3.  An amount-mapping utility translates drag displacement into a
    candidate amount.
4.  On gesture end, snap the amount to a valid increment and commit the
    value to the draft state.
5.  React renders the stable draft state and Save action.
6.  The user explicitly taps Save.
7.  The domain service validates and persists the expense.
8.  The UI transitions to the saved state only after persistence
    succeeds.

### Drag mapping

Do not use raw pixels as currency units. Define a deterministic mapping:

```ts
type DragConfig = {
  pixelsPerStep: number;
  fineStepMinor: number;
  coarseStepMinor: number;
  maxAmountMinor: number;
};

function amountFromDrag(
  startAmountMinor: number,
  translationY: number,
  config: DragConfig,
): number {
  // Example strategy:
  // - Map vertical movement to signed steps.
  // - Apply fine increments near the starting point.
  // - Apply a coarser multiplier for longer drags.
  // - Clamp to valid bounds.
  // - Return integer minor units.
  // Exact mapping should be tuned through device testing.
  return startAmountMinor;
}
```

This is a contract sketch, not production logic. Implement and unit-test
the real mapping. Decide the direction consistently (for example,
dragging upward increases the amount). Display a subtle visual hint so
users can discover it without reading a manual.

### Morphing/shared-element approach

- Use shared transition values for the category tile's position, size,
  corner radius, and background color.
- Keep the source and destination visually continuous; avoid
  unmounting the selected tile before the destination has taken over.
- Prefer Reanimated layout transitions or explicitly measured geometry
  where reliable.
- If exact shared-element behavior is fragile across navigation or
  platforms, implement a controlled overlay clone for the morph. Do
  not make the entire app dependent on a brittle third-party
  shared-element package.
- Ensure the transition can be interrupted by a new valid interaction
  without leaving orphaned overlays.
- Use stable IDs for categories and stable React keys.
- Avoid measuring layout repeatedly on the JS thread during the
  animation.

### Performance rules

- Run gesture-following animations on the UI thread.
- Keep React rerenders out of the per-frame path.
- Memoize only where profiling shows value; do not use blanket
  memoization as a substitute for good state boundaries.
- Avoid expensive shadows, blur, large offscreen surfaces, and
  animating many independent text layouts at once.
- Test on mid-range Android hardware as well as current iPhones.
- Test 60 Hz and high-refresh-rate devices.
- Use profiling tools to find dropped frames instead of guessing.
- The app must remain usable if animations are reduced or disabled.

---

## 10. Accessibility and interaction safety

- Every gesture-driven action has a button or keyboard alternative.
- Category tiles expose category names and selected state to
  VoiceOver/TalkBack.
- The amount control exposes its current formatted value and clear
  increment/decrement actions.
- Do not communicate category or success through color alone.
- Support system font scaling without clipping amounts or Save.
- Respect Reduce Motion and system animation settings by swapping
  movement for short fades---never by removing feedback entirely.
- Haptics are supplementary, never required to understand state.
- Minimum touch targets should be respected.
- Confirm destructive actions; offer Undo where practical.
- Never save on a gesture that can also be interpreted as
  cancellation.
- Prevent double submission and preserve drafts on errors.
- Do not show sensitive expense details in lock-screen notifications
  by default.

---

## 11. Currency, dates, and correctness

- Store the currency code with each expense. Changing the preferred
  currency later must not silently reinterpret historical amounts.
- Use locale-aware formatting and parsing.
- Do not use floating-point values for money calculations.
- Handle currencies with zero, two, or three minor-unit digits where
  applicable.
- Default occurrence time to now, using device locale/time zone.
- Store a normalized timestamp and display it in the user's local time
  zone.
- Treat future dates and timezone changes explicitly.
- Make deletion and editing transactional.
- Keep category IDs stable even if the user renames a category.
- Empty notes and titles should be omitted rather than persisted as
  meaningless strings.
- Make daily/weekly/monthly aggregation boundaries consistent with the
  selected locale and time zone.

---

## 12. Testing plan

### Unit tests

- Drag displacement maps to the expected amount.
- Amount snapping and clamping work at boundaries.
- Currency parsing/formatting handles supported currency exponents.
- Draft state transitions are valid.
- Invalid drafts cannot be saved.
- Duplicate save requests are prevented.
- Daily/weekly/monthly totals respect local date boundaries.
- Edit/delete/undo restore the correct record.
- Database migrations preserve existing expenses.

### Interaction tests

- Tap a category and immediately start dragging.
- Cancel a drag midway.
- Change category before saving.
- Open details, enter a note, close details, and verify the note
  remains.
- Save and immediately start the next expense.
- Double-tap Save.
- Background the app during a draft.
- Rotate or resize where supported.
- Use a small screen with a large accessibility font.
- Complete the flow with screen reader and no drag gestures.

### Animation QA

- No visible jump between category tile and selected state.
- No flicker, duplicate tile, or orphaned overlay during morph.
- Gesture remains responsive while transitions are running.
- Reversing or interrupting a transition returns to a valid UI state.
- Reduced-motion mode works.
- The amount never becomes unreadable during motion.
- Measure dropped frames on real devices.
- Confirm the UI stays responsive when storage writes are delayed or
  fail.

### Acceptance criteria

The signature flow is successful when: - A user can record a normal
expense without opening Details. - Category selection is one tap. -
Amount can be set through a direct drag or numeric keypad. - Save is
explicit and gives immediate feedback. - A failed save preserves the
draft. - The next entry can start immediately after saving. - The
interface remains understandable with animations reduced. - No
frame-by-frame gesture updates require React renders.

---

## 13. Delivery plan

### Phase 1 --- Interaction prototype

Build only Quick Add with mocked persistence: - Category tiles. - Amount
surface. - Drag mapping. - Numeric keypad fallback. - Save state. -
Category-to-composer morph. - Reduced-motion variant.

**Do not build all screens before the core gesture feels right.** Test
it on both iOS and Android.

### Phase 2 --- Local data

- Expense/category types.
- SQLite schema and migrations.
- Repository/service layer.
- Save/edit/delete.
- Undo behavior.
- Draft recovery rules.

### Phase 3 --- Activity and Details

- Activity list.
- Expense editing.
- Optional Details panel.
- Empty/loading/error states.

### Phase 4 --- Insights and Settings

- Period totals.
- Category breakdown.
- Currency and theme settings.
- Haptics and motion preferences.
- CSV export.

### Phase 5 --- Polish and verification

- Accessibility.
- Localization and currency edge cases.
- Android/iOS gesture arbitration.
- Animation profiling.
- Persistence failure testing.
- App lifecycle and background behavior.
- App Store / Play Store readiness.

---

## 14. Instructions for the AI coding agent

When implementing this specification:

1.  Inspect the existing repository and current React Native version
    before changing files.
2.  Preserve existing architecture and working functionality. Do not
    regenerate or replace the project.
3.  Implement with React Native CLI and TypeScript; do not convert the
    project to Expo.
4.  Prototype and validate Quick Add before expanding into secondary
    screens.
5.  Treat Reanimated and Gesture Handler as core architecture. Keep
    continuous gesture values on the UI thread.
6.  Separate domain logic, persistence, draft state, gesture state, and
    animation state.
7.  Build reusable animation primitives and centralized motion tokens;
    do not duplicate ad hoc animation constants across screens.
8.  Prefer native-feeling, interruptible morphs over flashy decorative
    motion.
9.  Animate everything. Every visible change---press states, colors,
    appearing/disappearing content, list changes, value changes, tab
    bar, tab switches, navigation---must transition. An instant visual
    change is a bug.
10. Keep the normal expense flow extremely short. Details, settings, and
    analytics must never block quick capture.
11. Do not invent backend requirements. The MVP is local-first and must
    work offline.
12. Do not store monetary values as floating-point numbers.
13. Include loading, empty, error, and reduced-motion states---not just
    the ideal animation.
14. Test real gesture behavior on iOS and Android, including
    cancellation and interrupted transitions.
15. Run type checks, linting, unit tests, and native builds where
    available. Report what was actually verified; do not claim tests
    passed if they were not run.
16. Make changes incrementally, inspect diffs, and avoid unrelated
    refactors.

### Definition of done

Spendly is not done when all pages exist. It is done when the primary
capture interaction is fast, predictable, accessible, visually coherent,
and fluid on real devices---and the underlying expense data remains
correct regardless of how an animation is interrupted.

---

## 15. Final product test

Ask one question during every design and engineering decision:

**"Does this make recording the next expense faster, clearer, or more
satisfying without making it less reliable?"**

If not, it probably does not belong in Spendly v1.
