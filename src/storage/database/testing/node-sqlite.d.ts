// Minimal types for Node's built-in SQLite, used only by the test database. Avoids pulling all of
// @types/node (and its globals) into the React Native type environment.
declare module 'node:sqlite' {
  type Value = string | number | bigint | null | Uint8Array;

  interface StatementSync {
    run(...params: Value[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: Value[]): Record<string, Value> | undefined;
    all(...params: Value[]): Record<string, Value>[];
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
