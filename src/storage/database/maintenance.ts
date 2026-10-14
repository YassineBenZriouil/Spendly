import type { Db } from './db.types';

/** Deleted expenses stay recoverable this long, then are removed for good. */
export const DELETED_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Permanently removes expenses deleted more than `DELETED_RETENTION_DAYS` ago. Returns how many. */
export async function purgeDeleted(db: Db, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - DELETED_RETENTION_DAYS * DAY_MS).toISOString();
  const result = await db.runAsync('DELETE FROM expenses WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoff]);
  return result.changes;
}

/** SQLite's own consistency check; `true` when the database file is healthy. */
export async function isDatabaseHealthy(db: Db): Promise<boolean> {
  const rows = await db.getAllAsync<{ quick_check: string }>('PRAGMA quick_check', []);
  return rows.length === 1 && rows[0].quick_check === 'ok';
}
