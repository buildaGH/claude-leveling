/**
 * player.ts — Persistent storage for the global Hunter (PlayerState).
 *
 * File location: ~/.claude-level/player.db
 * The DB holds one row with key="player" containing the full PlayerState JSON.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import type { PlayerState } from "../schema.js";
import { CURRENT_SCHEMA_VERSION, createPlayer } from "../defaults.js";
import { needsMigration, PLAYER_MIGRATIONS, runMigrations } from "../migrations/index.js";
import { openDb, readState, writeState } from "./db.js";

const PLAYER_DB_PATH = join(homedir(), ".claude-level", "player.db");
const STATE_KEY = "player";

export interface PlayerStorage {
  read(): PlayerState | null;
  write(state: PlayerState): void;
  readOrCreate(name: string): PlayerState;
  close(): void;
}

export function openPlayerStorage(dbPath: string = PLAYER_DB_PATH): PlayerStorage {
  const db = openDb(dbPath);

  return {
    read(): PlayerState | null {
      const raw = readState<Record<string, unknown>>(db, STATE_KEY);
      if (raw === null) return null;
      if (!needsMigration(raw, CURRENT_SCHEMA_VERSION)) return raw as unknown as PlayerState;

      const migrated = runMigrations(raw, PLAYER_MIGRATIONS, CURRENT_SCHEMA_VERSION) as unknown as PlayerState;
      writeState(db, STATE_KEY, migrated);
      return migrated;
    },

    write(state: PlayerState): void {
      writeState(db, STATE_KEY, { ...state, schemaVersion: CURRENT_SCHEMA_VERSION });
    },

    readOrCreate(name: string): PlayerState {
      const existing = this.read();
      if (existing !== null) return existing;

      const fresh = createPlayer(name);
      writeState(db, STATE_KEY, fresh);
      return fresh;
    },

    close(): void {
      db.close();
    },
  };
}
