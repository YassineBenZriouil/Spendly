import type { Message } from '../../types';

/** Quick log, shortcut links and the Android widget. */
export const shortcuts = {
  'shortcuts.intro': "Log an expense without going through the app's screens: Spendly opens, saves it and offers Undo.",
  'shortcuts.quickLog.title': "Quick log",
  'shortcuts.quickLog.caption': "The expense a shortcut or the quick settings tile saves, in your currency.",
  'shortcuts.quickLog.current': "Now: {amount}, {category}",
  'shortcuts.quickLog.none': "Not set up yet.",
  'shortcuts.quickLog.amount': "Amount ({currency})",
  'shortcuts.quickLog.invalid': "Enter an amount above zero and pick a category.",
  'shortcuts.quickLog.save': "Save quick log",
  'shortcuts.quickLog.remove': "Remove",
  'shortcuts.quickLog.saved': "Quick log: {amount}, {category}",
  'shortcuts.quickLog.removed': "Quick log removed",
  'shortcuts.links.title': "Links",
  'shortcuts.links.ios': "In the Shortcuts app: new shortcut → Open URLs → paste the link. Name it (for example \"Log coffee\") and say that name to Siri.",
  'shortcuts.links.android': "Any app or launcher that opens links can use these, for example as a home-screen shortcut.",
  'shortcuts.links.shareQuick': "Share quick log link",
  'shortcuts.links.example': "Or any amount and category, in English or Arabic:",
  'shortcuts.links.shareExample': "Share example link",
  'shortcuts.android.title': "On the home screen",
  'shortcuts.android.widget': "Widget: hold the home screen → Widgets → Spendly. It shows today's total; tap it to add.",
  'shortcuts.android.tile': "Quick settings tile: pull down twice → edit → drag \"Quick log\" in. One tap saves your quick log.",
  'shortcuts.widget.title': "Today",
  'shortcuts.widget.nothing': "Nothing yet",
  'shortcuts.widget.add': "Add",
  'shortcuts.widget.label': "Spendly, today: {amounts}. Opens Add.",
} as const satisfies Record<`shortcuts.${string}`, Message>;
