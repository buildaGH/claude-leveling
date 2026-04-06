import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "../../defaults.js";
import { openDungeonStorage } from "../dungeon.js";
import type { DungeonStorage } from "../dungeon.js";
import type { SessionRecord } from "../../schema.js";

let dir: string;
let storage: DungeonStorage;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-dungeon-test-"));
  storage = openDungeonStorage(dir);
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
  it("creates a new dungeon when none exists", () => {
    const dungeon = storage.readOrCreate("my-project");
    expect(dungeon.projectName).toBe("my-project");
    expect(dungeon.dungeonCleared).toBe(false);
    expect(dungeon.sessions).toEqual([]);
    expect(dungeon.quests).toEqual([]);
    expect(dungeon.totalDungeonXp).toBe(0);
  });

  it("stamps the current schema version on creation", () => {
    expect(storage.readOrCreate("proj").schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("returns the existing dungeon on subsequent calls", () => {
    const first = storage.readOrCreate("my-project");
    const second = storage.readOrCreate("other-name");
    expect(second.projectName).toBe(first.projectName);
    expect(second.firstEnteredAt).toBe(first.firstEnteredAt);
  });
});

describe("write", () => {
  it("persists changes visible via read", () => {
    const dungeon = storage.readOrCreate("my-project");
    storage.write({ ...dungeon, dungeonCleared: true, totalDungeonXp: 350 });

    const reloaded = storage.read();
    expect(reloaded?.dungeonCleared).toBe(true);
    expect(reloaded?.totalDungeonXp).toBe(350);
  });

  it("always stamps the current schema version", () => {
    const dungeon = storage.readOrCreate("proj");
    storage.write({ ...dungeon, schemaVersion: "0.0.1" });
    expect(storage.read()?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("persists session records", () => {
    const dungeon = storage.readOrCreate("my-project");
    const session: SessionRecord = {
      sessionId: "abc-123",
      startedAt: new Date().toISOString(),
      endedAt: null,
      outcome: "in-progress",
      xpEarned: 120,
      statDeltas: { agility: 2 },
      questsCompleted: [],
    };
    storage.write({ ...dungeon, sessions: [session] });

    const reloaded = storage.read();
    expect(reloaded?.sessions).toHaveLength(1);
    expect(reloaded?.sessions[0]?.sessionId).toBe("abc-123");
    expect(reloaded?.sessions[0]?.xpEarned).toBe(120);
  });
});

describe("isolation", () => {
  it("two storage instances on different project roots are independent", () => {
    const dirB = mkdtempSync(join(tmpdir(), "cl-dungeon-test-b-"));
    const storageB = openDungeonStorage(dirB);

    storage.readOrCreate("project-alpha");
    storageB.readOrCreate("project-beta");

    expect(storage.read()?.projectName).toBe("project-alpha");
    expect(storageB.read()?.projectName).toBe("project-beta");

    storageB.close();
    rmSync(dirB, { recursive: true });
  });
});
