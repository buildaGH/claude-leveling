import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDungeonStorage } from "../../storage/dungeon.js";
import type { DungeonStorage } from "../../storage/dungeon.js";
import { updateQuestProgress } from "../tracker.js";
import type { LocalQuest } from "../../schema.js";
import type { XPEvent } from "../../events/types.js";

let dir: string;
let storage: DungeonStorage;

function event(type: XPEvent["type"], metadata: Record<string, unknown> = {}): XPEvent {
  return { type, occurredAt: new Date().toISOString(), metadata };
}

function activeQuest(overrides: Partial<LocalQuest>): LocalQuest {
  return {
    questId: "q1", archetype: "dungeon-raid", frequency: "daily",
    title: "Test Quest", description: "", xpReward: 150,
    status: "active", activeDate: "2026-04-08",
    expiresAt: "2026-04-08T23:59:59.999Z",
    resolvedAt: null, progress: 0, goal: 3, metadata: {},
    ...overrides,
  };
}

function seedQuest(quest: LocalQuest): void {
  const dungeon = storage.readOrCreate("proj");
  storage.write({ ...dungeon, quests: [quest] });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-tracker-test-"));
  storage = openDungeonStorage(dir);
  storage.readOrCreate("proj");
});

afterEach(() => {
  storage.close();
  rmSync(dir, { recursive: true });
});

// ---------------------------------------------------------------------------
// dungeon-raid
// ---------------------------------------------------------------------------

describe("dungeon-raid progress", () => {
  it("increments progress on git-commit", () => {
    seedQuest(activeQuest({ archetype: "dungeon-raid", goal: 3 }));
    updateQuestProgress(storage, event("git-commit"));
    expect(storage.read()?.quests[0]?.progress).toBe(1);
  });

  it("completes when progress reaches goal", () => {
    seedQuest(activeQuest({ archetype: "dungeon-raid", goal: 1 }));
    const { completed } = updateQuestProgress(storage, event("git-commit"));
    expect(completed).toHaveLength(1);
    expect(storage.read()?.quests[0]?.status).toBe("completed");
  });

  it("does not progress on unrelated events", () => {
    seedQuest(activeQuest({ archetype: "dungeon-raid", goal: 3 }));
    updateQuestProgress(storage, event("test-pass"));
    expect(storage.read()?.quests[0]?.progress).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// hunt-the-weak
// ---------------------------------------------------------------------------

describe("hunt-the-weak progress", () => {
  it("increments progress on test-pass", () => {
    seedQuest(activeQuest({ archetype: "hunt-the-weak", goal: 5 }));
    updateQuestProgress(storage, event("test-pass"));
    expect(storage.read()?.quests[0]?.progress).toBe(1);
  });

  it("completes after goal test passes", () => {
    seedQuest(activeQuest({ archetype: "hunt-the-weak", goal: 2 }));
    updateQuestProgress(storage, event("test-pass"));
    updateQuestProgress(storage, event("test-pass"));
    expect(storage.read()?.quests[0]?.status).toBe("completed");
  });
});

// ---------------------------------------------------------------------------
// gate-siege
// ---------------------------------------------------------------------------

describe("gate-siege progress", () => {
  it("tracks three distinct checkpoints", () => {
    seedQuest(activeQuest({
      archetype: "gate-siege", goal: 3,
      metadata: { checkpoints: [] },
    }));

    updateQuestProgress(storage, event("git-commit"));
    expect(storage.read()?.quests[0]?.progress).toBe(1);

    updateQuestProgress(storage, event("test-pass"));
    expect(storage.read()?.quests[0]?.progress).toBe(2);

    const { completed } = updateQuestProgress(storage, event("build-pass"));
    expect(completed).toHaveLength(1);
    expect(storage.read()?.quests[0]?.status).toBe("completed");
  });

  it("does not double-count the same checkpoint", () => {
    seedQuest(activeQuest({ archetype: "gate-siege", goal: 3, metadata: { checkpoints: [] } }));
    updateQuestProgress(storage, event("git-commit"));
    updateQuestProgress(storage, event("git-commit")); // duplicate
    expect(storage.read()?.quests[0]?.progress).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// speed-clear
// ---------------------------------------------------------------------------

describe("speed-clear progress", () => {
  it("starts the timer on test-fail", () => {
    const e = event("test-fail");
    seedQuest(activeQuest({
      archetype: "speed-clear", goal: 1,
      metadata: { timerStartedAt: null },
    }));
    updateQuestProgress(storage, e);
    expect(storage.read()?.quests[0]?.metadata["timerStartedAt"]).toBe(e.occurredAt);
  });

  it("completes when test-pass occurs within 30 minutes", () => {
    const failTime = new Date("2026-04-08T10:00:00.000Z").toISOString();
    const passTime = new Date("2026-04-08T10:15:00.000Z").toISOString(); // 15m later

    seedQuest(activeQuest({
      archetype: "speed-clear", goal: 1,
      metadata: { timerStartedAt: failTime },
    }));

    const { completed } = updateQuestProgress(storage, { type: "test-pass", occurredAt: passTime, metadata: {} });
    expect(completed).toHaveLength(1);
  });

  it("does not complete when test-pass is outside the window", () => {
    const failTime = new Date("2026-04-08T10:00:00.000Z").toISOString();
    const passTime = new Date("2026-04-08T10:31:00.000Z").toISOString(); // 31m later

    seedQuest(activeQuest({
      archetype: "speed-clear", goal: 1,
      metadata: { timerStartedAt: failTime },
    }));

    const { completed } = updateQuestProgress(storage, { type: "test-pass", occurredAt: passTime, metadata: {} });
    expect(completed).toHaveLength(0);
    // Timer should be reset
    expect(storage.read()?.quests[0]?.metadata["timerStartedAt"]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// endurance-trial
// ---------------------------------------------------------------------------

describe("endurance-trial progress", () => {
  it("sets progress to sessionMinutes on session-end", () => {
    seedQuest(activeQuest({ archetype: "endurance-trial", goal: 60 }));
    updateQuestProgress(storage, event("session-end", { sessionMinutes: 45 }));
    expect(storage.read()?.quests[0]?.progress).toBe(45);
  });

  it("completes when session meets the goal", () => {
    seedQuest(activeQuest({ archetype: "endurance-trial", goal: 30 }));
    const { completed } = updateQuestProgress(storage, event("session-end", { sessionMinutes: 35 }));
    expect(completed).toHaveLength(1);
  });

  it("takes the max of existing progress and new session minutes", () => {
    seedQuest(activeQuest({ archetype: "endurance-trial", goal: 60, progress: 50 }));
    updateQuestProgress(storage, event("session-end", { sessionMinutes: 40 }));
    expect(storage.read()?.quests[0]?.progress).toBe(50); // kept existing higher value
  });
});

// ---------------------------------------------------------------------------
// Already-resolved quests are not modified
// ---------------------------------------------------------------------------

describe("resolved quests", () => {
  it("does not update a completed quest", () => {
    seedQuest(activeQuest({ archetype: "dungeon-raid", goal: 3, status: "completed", progress: 3 }));
    updateQuestProgress(storage, event("git-commit"));
    expect(storage.read()?.quests[0]?.progress).toBe(3);
  });

  it("does not update an expired quest", () => {
    seedQuest(activeQuest({ archetype: "dungeon-raid", goal: 3, status: "expired" }));
    updateQuestProgress(storage, event("git-commit"));
    expect(storage.read()?.quests[0]?.status).toBe("expired");
  });
});
