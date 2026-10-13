// Test-only: runs the app's real SQL against Node's built-in SQLite (no native module needed).
import { DatabaseSync } from 'node:sqlite';

import type { Db, SqlValue } from '../db.types';

export function createTestDatabase(): Db {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  // node:sqlite returns null-prototype rows; copy them so Jest equality behaves normally
  const plain = <T>(row: unknown) => (row ? ({ ...(row as object) } as T) : null);

  const db: Db = {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async runAsync(sql, params: SqlValue[]) {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[]) {
      return plain<T>(sqlite.prepare(sql).get(...params));
    },
    async getAllAsync<T>(sql: string, params: SqlValue[]) {
      return sqlite.prepare(sql).all(...params).map((row) => plain<T>(row) as T);
    },
    async withExclusiveTransactionAsync(task) {
      sqlite.exec('BEGIN EXCLUSIVE');
      try {
        await task(db);
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return db;
}
