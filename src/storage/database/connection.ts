import * as SQLite from 'expo-sqlite';

import type { Db } from './db.types';
import { databaseHealth } from './health';
import { isDatabaseHealthy, purgeDeleted } from './maintenance';
import { migrate } from './migrations';

const DATABASE_NAME = 'spendly.db';

let database: Promise<Db> | null = null;

async function open(): Promise<Db> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  // Checked before anything writes to it; a damaged file is reported, never repaired or replaced
  if (!(await isDatabaseHealthy(db).catch(() => false))) databaseHealth.markDamaged();
  await migrate(db);
  // Housekeeping only: a failure here must not stop the app from opening
  await purgeDeleted(db).catch(() => 0);
  return db;
}

/** The app's single database, opened, checked and migrated on first use. */
export function getDatabase(): Promise<Db> {
  if (!database) {
    database = open().catch((error) => {
      // Let the next call retry instead of caching the failure forever
      database = null;
      throw error;
    });
  }
  return database;
}
