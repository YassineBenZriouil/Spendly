import type { Message } from '../../types';

/** App lock: the lock screen and its setting. */
export const lock = {
  'lock.title': "Spendly is locked",
  'lock.unlock': "Unlock",
  'lock.prompt': "Unlock Spendly",
  'lock.cancel': "Cancel",
  'lock.failed': "Couldn't unlock. Try again.",
  'lock.unlocked': "Unlocked",
  'lock.turnedOffTitle': "App lock turned off",
  'lock.turnedOffMessage': "This phone no longer has a passcode, Face ID or fingerprint, so Spendly can't check it's you. Turn App lock on again once one is set up.",
  'lock.settings.label': "App lock",
  'lock.settings.caption': "Face ID, fingerprint or your phone's passcode. Locks when you leave the app and hides it in the app switcher.",
  'lock.settings.enablePrompt': "Turn on App lock",
  'lock.settings.noPasscodeTitle': "Set a passcode first",
  'lock.settings.noPasscodeMessage': "App lock uses your phone's passcode, Face ID or fingerprint. Set one up in your phone's settings, then try again.",
  'lock.settings.grace': "Lock",
  'lock.settings.immediately': "Immediately",
  'lock.settings.oneMinute': "After 1 minute",
  'lock.settings.on': "App lock on",
  'lock.settings.off': "App lock off",
} as const satisfies Record<`lock.${string}`, Message>;
