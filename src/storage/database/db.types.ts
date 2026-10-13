export type SqlValue = string | number | null;

/**
 * The slice of expo-sqlite's `SQLiteDatabase` the app uses. Repositories and migrations depend on
 * this, so tests can run the real SQL against Node's built-in SQLite.
 */
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlValue[]): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params: SqlValue[]): Promise<T[]>;
  /** All queries inside must go through `txn`. */
  withExclusiveTransactionAsync(task: (txn: Db) => Promise<void>): Promise<void>;
}
