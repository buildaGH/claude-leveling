import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "../../defaults.js";
import { openPlayerStorage } from "../player.js";
import type { PlayerStorage } from "../player.js";

let dir: string;
let storage: PlayerStorage;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-player-test-"));
  storage = openPlayerStorage(join(dir, "player.db"));
});

afterEach(() => {
  storage.close();
  rmSync(dir, { recursive: true });
});

describe("read", () => {
  it("returns null on a fresh database", () => {
    expect(storage.read()).toBeNull();
  });
});

describe("readOrCreate", () => {
  it("creates a new player when none exists", () => {
    const player = storage.readOrCreate("Sung Jin-Woo");
    expect(player.name).toBe("Sung Jin-Woo");
    expect(player.rank).toBe("E");
    expect(player.totalXp).toBe(0);
    expect(player.hunterId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("stamps the current schema version on creation", () => {
    const player = storage.readOrCreate("Hunter");
    expect(player.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("returns the existing player on subsequent calls", () => {
    const first = storage.readOrCreate("Sung Jin-Woo");
    const second = storage.readOrCreate("Different Name");
    expect(second.hunterId).toBe(first.hunterId);
    expect(second.name).toBe("Sung Jin-Woo");
  });
});

describe("write", () => {
  it("persists changes that are visible via read", () => {
    const player = storage.readOrCreate("Sung Jin-Woo");
    storage.write({ ...player, totalXp: 1500, rank: "D" });

    const reloaded = storage.read();
    expect(reloaded?.totalXp).toBe(1500);
    expect(reloaded?.rank).toBe("D");
  });

  it("always stamps the current schema version", () => {
    const player = storage.readOrCreate("Hunter");
    // Simulate a stale version coming in
    storage.write({ ...player, schemaVersion: "0.0.1" });
    expect(storage.read()?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("preserves hunterId across writes", () => {
    const player = storage.readOrCreate("Sung Jin-Woo");
    storage.write({ ...player, totalXp: 999 });
    expect(storage.read()?.hunterId).toBe(player.hunterId);
  });
});

describe("isolation", () => {
  it("two storage instances on different paths are independent", () => {
    const other = openPlayerStorage(join(dir, "other.db"));
    storage.readOrCreate("Alpha");
    other.readOrCreate("Beta");

    expect(storage.read()?.name).toBe("Alpha");
    expect(other.read()?.name).toBe("Beta");
    other.close();
  });
});
