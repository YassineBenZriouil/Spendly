import * as LocalAuthentication from 'expo-local-authentication';

import { t } from '@/i18n';

/**
 * ok: it's the owner · cancelled: they closed the prompt · failed: not recognised or locked out for now ·
 * unavailable: the phone has no passcode, Face ID or fingerprint, so there is nothing to check against.
 */
export type AuthResult = 'ok' | 'cancelled' | 'failed' | 'unavailable';

const UNAVAILABLE = new Set(['not_enrolled', 'passcode_not_set', 'not_available']);
const CANCELLED = new Set(['user_cancel', 'system_cancel', 'app_cancel']);

/** Face ID / fingerprint, falling back to the phone's passcode (so failed or removed biometrics never lock anyone out). */
export async function authenticate(promptMessage = t('lock.prompt')): Promise<AuthResult> {
  if ((await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE) return 'unavailable';
  const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: t('lock.cancel'), disableDeviceFallback: false });
  if (result.success) return 'ok';
  if (UNAVAILABLE.has(result.error)) return 'unavailable';
  return CANCELLED.has(result.error) ? 'cancelled' : 'failed';
}
