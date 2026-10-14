# Spendly accessibility test matrix

Run this before every release, on a real iPhone and a real Android phone (the smallest screen you support for the
text-size rows). Phase 6 of `PHASES-2.md` is done when every cell passes.

## The flow to complete in every setting

1. **Add**: pick a category, set the amount (without dragging: − / +, keypad or a suggestion), Save.
2. **Undo** that save.
3. **Edit** an expense from Activity: change amount, category, title, date. Save, then Undo the edit.
4. **Delete** an expense, then Undo.
5. **Insights**: switch week / month, step back a period, open a highlight (goes to Activity filtered).
6. **Export** a CSV through the share sheet.
7. **Back up** and **Restore** (Settings → Data).
8. **Reorder** a category without dragging (screen reader: Move up / Move down actions).
9. **Repeat**: set Repeat on an expense; when due, Confirm and Skip it (row buttons, or the row's actions with a screen reader), then Undo each. Use **Again** on an expense without swiping (row action or the edit screen button).
10. **Receipt photo**: in the details (Quick Add or edit screen), Add receipt photo → Take photo and → Choose from library; open the thumbnail full screen and close it; Replace it; Remove it, then Undo. Each outcome is announced ("Photo added", "Photo removed", "Photo put back"); the thumbnail reads "Receipt photo, image button". With camera access denied, the alert offers Open Settings.
11. **App lock**: Settings → Security → turn App lock on (the unlock prompt appears first), set Lock to After 1 minute and back. Leave the app and return: the lock screen reads "Spendly is locked", header, then the Unlock button; the app behind it can't be reached. Cancel the prompt, then unlock with the button. "Unlocked" is announced.
12. **Daily reminder**: Settings → Reminder → turn it on (our explanation, then the system prompt), change the time (iOS: the time control; Android: the "Reminder time" button opens the clock). "Daily reminder on, at …" is announced. Tap a reminder notification: the app opens on Add.
13. **Shortcuts**: Settings → Shortcuts: set a Quick log (amount field, category grid), Save, Remove; Share a link. Open `spendly://add?amount=20&category=Food&save=1` (and the same with `category=طعام`): "Saved …, Food. Undo is available." is announced and Undo appears on Add. A link with a wrong category says so on Add and saves nothing. Android: the widget reads "Spendly, today: …. Opens Add."; the "Quick log" tile saves the Quick log (unlock first on a locked phone).

## Matrix

| Setting | iOS | Android | What to look for |
| --- | --- | --- | --- |
| Screen reader | VoiceOver | TalkBack | Every control has a name, role and state; reading order is logical; each list row is one element; save / delete / undo are announced. |
| Largest text size | Larger Accessibility Sizes (max) | Font size max + Display size max | No clipped or overlapping text; amounts and Save stay usable; free text wraps. |
| Bold Text | Bold Text | Bold text | Labels still fit their controls. |
| Reduce Motion | Reduce Motion | Remove animations | Movement becomes short fades; nothing pops in instantly; nothing is lost. |
| Reduce Transparency | Reduce Transparency | n/a | Tab bar and sheets stay legible. |
| Increase Contrast | Increase Contrast | High contrast text | Borders and secondary text remain visible. |
| Switch access | Switch Control | Switch Access | Every flow above is reachable without touch gestures. |
| Voice | Voice Control | Voice Access | Every control can be activated by its spoken name. |
| Language | Arabic (right-to-left) | Arabic (right-to-left) | Text translated, layout mirrored, numbers still read left-to-right, chevrons point the right way. Test both ways: the phone in Arabic with Settings → Language on System, and Settings → Language switched between English and العربية (the app restarts each time). |

## Every gesture has an alternative

| Gesture | Alternative |
| --- | --- |
| Drag the amount | − / + buttons, keypad, amount suggestions; screen readers: swipe up / down on the amount (adjustable). |
| Hold a category tile (opens category management) | Settings → Manage categories. |
| Hold-and-drag to reorder categories | Screen reader actions "Move up" / "Move down" on each row. |
| Swipe back | The back button in the header. |
| Swipe an expense for Again | The row's "Again" action (screen readers) and the Again button on the edit screen. |
| Tap a chart bar | The breakdown list below it holds the same numbers; each bar is a labelled button. |
| Pinch / zoom a receipt photo | Not offered: the full-screen photo fits the screen; the system zoom (Zoom / Magnification) works on it. |

## Haptics are never the only signal

| Haptic | What you also see |
| --- | --- |
| Tick while dragging | The amount's digits change. |
| Firmer tap at 0 / the maximum | The number stops (and is pulled slightly, unless Reduce Motion is on); − or + turns disabled. |
| Tap on picking a category | The tile is selected and the category appears above the amount. |
| Success on save | The button reads "Saved" and Undo appears. |
| Tap when lifting / moving a category | The row lifts with a shadow; other rows move aside. |
| Tap when turning haptics on | The switch changes state. |
