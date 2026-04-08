/**
 * storage-migration.test.ts
 *
 * Verifies that the storage layer automatically migrates stale state on read.
 * We simulate a "future schema bump" by writing raw state with an old version
 * directly into the DB, then reading it back through the storage API.
 *
 * This test exercises the full path:
 *   write stale JSON → storage.read() → runMigrations → return current-typed state
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDb, writeState } from "../../storage/db.js";
import { openPlayerStorage } from "../../storage/player.js";
import { openDungeonStorage } from "../../storage/dungeon.js";
import * as registry from "../registry.js";
import { CURRENT_SCHEMA_VERSION } from "../../defaults.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-migration-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true });
  vi.restoreAllMocks();
});

describe("PlayerStorage migration on read", () => {
  it("returns state unchanged when schemaVersion matches current", () => {
    const dbPath = join(dir, "player.db");
    const db = openDb(dbPath);
    writeState(db, "player", {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      name: "Hunter",
      hunterId: "abc",
    });
    db.close();

    const storage = openPlayerStorage(dbPath);
    const state = storage.read();
    expect(state?.["name"]).toBe("Hunter");
    storage.close();
  });

  it("runs registered player migrations when version is stale", () => {
    // Simulate a migration that adds a `migratedFlag` field
    vi.spyOn(registry, "PLAYER_MIGRATIONS", "get").mockReturnValue([
      {
        fromVersion: "0.9.0",
        toVersion: CURRENT_SCHEMA_VERSION,
        up: (s) => ({ ...s, schemaVersion: CURRENT_SCHEMA_VERSION, migratedFlag: true }),
      },
    ]);

    const dbPath = join(dir, "player.db");
    const db = openDb(dbPath);
    writeState(db, "player", { schemaVersion: "0.9.0", name: "OldHunter" });
    db.close();

    const storage = openPlayerStorage(dbPath);
    const state = storage.read() as Record<string, unknown>;
    expect(state?.["schemaVersion"]).toBe(CURRENT_SCHEMA_VERSION);
    expect(state?.["migratedFlag"]).toBe(true);
    expect(state?.["name"]).toBe("OldHunter");
    storage.close();
  });

  it("persists the migrated state back to the DB", () => {
    vi.spyOn(registry, "PLAYER_MIGRATIONS", "get").mockReturnValue([
      {
        fromVersion: "0.9.0",
        toVersion: CURRENT_SCHEMA_VERSION,
        up: (s) => ({ ...s, schemaVersion: CURRENT_SCHEMA_VERSION }),
      },
    ]);

    const dbPath = join(dir, "player.db");
    const db = openDb(dbPath);
    writeState(db, "player", { schemaVersion: "0.9.0", name: "Hunter" });
    db.close();

    const storage = openPlayerStorage(dbPath);
    storage.read(); // triggers migration + persist

    // Re-open — should not need migration again
    storage.close();
    const storage2 = openPlayerStorage(dbPath);
    const state = storage2.read();
    expect(state?.["schemaVersion"]).toBe(CURRENT_SCHEMA_VERSION);
    storage2.close();
  });
});

describe("DungeonStorage migration on read", () => {
  it("runs registered dungeon migrations when version is stale", () => {
    vi.spyOn(registry, "DUNGEON_MIGRATIONS", "get").mockReturnValue([
      {
        fromVersion: "0.9.0",
        toVersion: CURRENT_SCHEMA_VERSION,
        up: (s) => ({ ...s, schemaVersion: CURRENT_SCHEMA_VERSION, dungeonMigrated: true }),
      },
    ]);

    const db = openDb(join(dir, ".claude-level", "dungeon.db"));
    writeState(db, "dungeon", { schemaVersion: "0.9.0", projectName: "old-project" });
    db.close();

    const storage = openDungeonStorage(dir);
    const state = storage.read() as Record<string, unknown>;
    expect(state?.["schemaVersion"]).toBe(CURRENT_SCHEMA_VERSION);
    expect(state?.["dungeonMigrated"]).toBe(true);
    storage.close();
  });
});
