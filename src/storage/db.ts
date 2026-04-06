/**
 * db.ts — Shared SQLite setup.
 *
 * Each storage file (player, dungeon) is its own SQLite database.
 * We use a single `state` table as a key-value store — the full document is
 * serialised as JSON and stored in one row. This gives us:
 *   - Atomic writes via SQLite transactions
 *   - Concurrent-write safety (WAL mode)
 *   - No JSON file corruption from parallel hook executions
 */

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function openDb(filePath: string): Database.Database {
  mkdirSync(dirname(filePath), { recursive: true });

  const db = new Database(filePath);

  // WAL mode: readers never block writers, writers never block readers.
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS state (
      key        TEXT NOT NULL PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return db;
}

export function readState<T>(db: Database.Database, key: string): T | null {
  const row = db.prepare("SELECT value FROM state WHERE key = ?").get(key) as
    | { value: string }
    | undefined;

  if (row === undefined) return null;
  return JSON.parse(row.value) as T;
}

export function writeState<T>(db: Database.Database, key: string, value: T): void {
  db.prepare(`
    INSERT INTO state (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value      = excluded.value,
      updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), new Date().toISOString());
}
