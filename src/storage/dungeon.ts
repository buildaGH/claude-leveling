/**
 * dungeon.ts — Persistent storage for per-project dungeon state (DungeonState).
 *
 * File location: <project-root>/.claude-level/dungeon.db
 * The DB holds one row with key="dungeon" containing the full DungeonState JSON.
 */

import { join } from "node:path";
import type { DungeonState } from "../schema.js";
import { CURRENT_SCHEMA_VERSION, createDungeon } from "../defaults.js";
import { needsMigration, DUNGEON_MIGRATIONS, runMigrations } from "../migrations/index.js";
import { openDb, readState, writeState } from "./db.js";

const DUNGEON_DB_RELATIVE = join(".claude-level", "dungeon.db");
const STATE_KEY = "dungeon";

function dbPath(projectRoot: string): string {
  return join(projectRoot, DUNGEON_DB_RELATIVE);
}

export interface DungeonStorage {
  read(): DungeonState | null;
  write(state: DungeonState): void;
  readOrCreate(projectName: string): DungeonState;
  close(): void;
}

export function openDungeonStorage(projectRoot: string = process.cwd()): DungeonStorage {
  const db = openDb(dbPath(projectRoot));

  return {
    read(): DungeonState | null {
      const raw = readState<Record<string, unknown>>(db, STATE_KEY);
      if (raw === null) return null;
      if (!needsMigration(raw, CURRENT_SCHEMA_VERSION)) return raw as unknown as DungeonState;

      const migrated = runMigrations(raw, DUNGEON_MIGRATIONS, CURRENT_SCHEMA_VERSION) as unknown as DungeonState;
      writeState(db, STATE_KEY, migrated);
      return migrated;
    },

    write(state: DungeonState): void {
      writeState(db, STATE_KEY, { ...state, schemaVersion: CURRENT_SCHEMA_VERSION });
    },

    readOrCreate(projectName: string): DungeonState {
      const existing = this.read();
      if (existing !== null) return existing;

      const fresh = createDungeon(projectName);
      writeState(db, STATE_KEY, fresh);
      return fresh;
    },

    close(): void {
      db.close();
    },
  };
}
