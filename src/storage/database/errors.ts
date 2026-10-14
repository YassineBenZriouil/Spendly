import { t } from '@/i18n';

const STORAGE_FULL = /SQLITE_FULL|disk is full|no space left|ENOSPC/i;

/** The write failed because the phone has no free storage. */
export function isStorageFull(error: unknown): boolean {
  return STORAGE_FULL.test(error instanceof Error ? error.message : String(error));
}

export const STORAGE_FULL_MESSAGE = t('data.storageFull');

/** What to tell the user after a failed write: storage-full gets its own explanation, anything else `fallback`. */
export function writeFailureMessage(error: unknown, fallback: string): string {
  return isStorageFull(error) ? STORAGE_FULL_MESSAGE : fallback;
}
