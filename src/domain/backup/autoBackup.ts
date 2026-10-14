/** Auto-backup: a backup file written by itself every week, the last few kept on the phone (Stage 2 Phase 7). */
export const AUTO_BACKUP_EVERY_DAYS = 7;
export const AUTO_BACKUP_KEEP = 4;

const DAY_MS = 24 * 60 * 60 * 1000;
/** A run an hour early still counts as a week (background tasks run when the system decides, not to the minute). */
const SLACK_MS = 60 * 60 * 1000;
const NAME = /^spendly-auto-(\d{4})-(\d{2})-(\d{2})\.json$/;

const pad = (value: number) => String(value).padStart(2, '0');

/** File name for a backup made at `now` (its local date): one per day at most. */
export const autoBackupName = (now: Date) => `spendly-auto-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;

export const isAutoBackupName = (name: string) => NAME.test(name);

/** Due when there has never been one, or the last one is a week old. */
export function isAutoBackupDue(lastAt: string | undefined, now: Date): boolean {
  if (!lastAt) return true;
  const last = Date.parse(lastAt);
  return Number.isNaN(last) || now.getTime() - last >= AUTO_BACKUP_EVERY_DAYS * DAY_MS - SLACK_MS;
}

/** Older auto-backups beyond the newest `keep`. Other files (a manual backup, anything else) are never touched. */
export function autoBackupsToDelete(names: string[], keep = AUTO_BACKUP_KEEP): string[] {
  return names
    .filter(isAutoBackupName)
    .sort()
    .reverse()
    .slice(keep);
}
