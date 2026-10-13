import * as SQLite from 'expo-sqlite';

import type { Db } from './db.types';
import { migrate } from './migrations';

const DATABASE_NAME = 'spendly.db';

let database: Promise<Db> | null = null;

async function open(): Promise<Db> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

/** The app's single database, opened and migrated on first use. */
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
