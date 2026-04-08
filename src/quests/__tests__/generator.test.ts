import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDungeonStorage } from "../../storage/dungeon.js";
import { openPlayerStorage } from "../../storage/player.js";
import type { DungeonStorage } from "../../storage/dungeon.js";
import type { PlayerStorage } from "../../storage/player.js";
import { expireQuests, refreshQuests, todayStr, weekStartStr } from "../generator.js";
import type { LocalQuest } from "../../schema.js";

let dir: string;
let dungeonStorage: DungeonStorage;
let playerStorage: PlayerStorage;
const NOW = new Date("2026-04-08T10:00:00.000Z");

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-gen-test-"));
  dungeonStorage = openDungeonStorage(dir);
  playerStorage  = openPlayerStorage(join(dir, "player.db"));
  dungeonStorage.readOrCreate("test-project");
  playerStorage.readOrCreate("Hunter");
});

afterEach(() => {
  dungeonStorage.close();
  playerStorage.close();
  rmSync(dir, { recursive: true });
});

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

describe("todayStr", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(todayStr(NOW)).toBe("2026-04-08");
  });
});

describe("weekStartStr", () => {
  it("returns the most recent Monday for a Wednesday", () => {
    // 2026-04-08 is a Wednesday — Monday was 2026-04-06
    expect(weekStartStr(NOW)).toBe("2026-04-06");
  });

  it("returns the same day when the input is a Monday", () => {
    expect(weekStartStr(new Date("2026-04-06T10:00:00.000Z"))).toBe("2026-04-06");
  });
});

// ---------------------------------------------------------------------------
// expireQuests
// ---------------------------------------------------------------------------

describe("expireQuests", () => {
  function quest(expiresAt: string, status: LocalQuest["status"] = "active"): LocalQuest {
    return {
      questId: "q1", archetype: "dungeon-raid", frequency: "daily",
      title: "Test", description: "", xpReward: 100,
      status, activeDate: "2026-04-07", expiresAt,
      resolvedAt: null, progress: 0, goal: 3, metadata: {},
    };
  }

  it("marks expired active quests as expired", () => {
    const q = quest("2026-04-07T23:59:59.999Z");
    const result = expireQuests([q], NOW);
    expect(result[0]?.status).toBe("expired");
    expect(result[0]?.resolvedAt).not.toBeNull();
  });

  it("leaves future quests untouched", () => {
    const q = quest("2026-04-09T23:59:59.999Z");
    const result = expireQuests([q], NOW);
    expect(result[0]?.status).toBe("active");
  });

  it("does not re-expire already completed quests", () => {
    const q = quest("2026-04-07T23:59:59.999Z", "completed");
    const result = expireQuests([q], NOW);
    expect(result[0]?.status).toBe("completed");
  });
});

// ---------------------------------------------------------------------------
// refreshQuests
// ---------------------------------------------------------------------------

describe("refreshQuests", () => {
  it("generates 3 daily quests on first call", () => {
    const { generated } = refreshQuests(dungeonStorage, playerStorage, NOW);
    const daily = generated.filter((q) => q.frequency === "daily");
    expect(daily).toHaveLength(3);
  });

  it("generates 2 weekly quests on first call", () => {
    const { generated } = refreshQuests(dungeonStorage, playerStorage, NOW);
    const weekly = generated.filter((q) => q.frequency === "weekly");
    expect(weekly).toHaveLength(2);
  });

  it("persists generated quests to storage", () => {
    refreshQuests(dungeonStorage, playerStorage, NOW);
    expect(dungeonStorage.read()?.quests.length).toBeGreaterThanOrEqual(5);
  });

  it("is idempotent — calling twice does not double-generate", () => {
    refreshQuests(dungeonStorage, playerStorage, NOW);
    const { generated } = refreshQuests(dungeonStorage, playerStorage, NOW);
    expect(generated).toHaveLength(0);
  });

  it("generates new daily quests on the next day", () => {
    refreshQuests(dungeonStorage, playerStorage, NOW);
    const tomorrow = new Date("2026-04-09T10:00:00.000Z");
    const { generated } = refreshQuests(dungeonStorage, playerStorage, tomorrow);
    const daily = generated.filter((q) => q.frequency === "daily");
    expect(daily).toHaveLength(3);
  });

  it("returns expired count for stale quests", () => {
    // Create a quest that will be stale by NOW
    const dungeon = dungeonStorage.read()!;
    dungeonStorage.write({
      ...dungeon,
      quests: [{
        questId: "old", archetype: "dungeon-raid", frequency: "daily",
        title: "Old Quest", description: "", xpReward: 100,
        status: "active", activeDate: "2026-04-07",
        expiresAt: "2026-04-07T23:59:59.999Z",
        resolvedAt: null, progress: 0, goal: 3, metadata: {},
      }],
    });
    const { expired } = refreshQuests(dungeonStorage, playerStorage, NOW);
    expect(expired).toBe(1);
  });
});
