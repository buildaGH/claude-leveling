import { describe, expect, it } from "vitest";
import type { PlayerState, DungeonState } from "../../schema.js";
import { updateAchievements, checkCleanSession, getNewTitles, applyNewTitles } from "../checker.js";
import { createPlayer } from "../../defaults.js";
import { createDungeon } from "../../defaults.js";

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { ...createPlayer("Hunter", "claude-leveling"), ...overrides };
}

function makeDungeon(rateLimitState: Record<string, string> = {}): DungeonState {
  return { ...createDungeon("claude-leveling"), rateLimitState };
}

// ---------------------------------------------------------------------------
// updateAchievements
// ---------------------------------------------------------------------------

describe("updateAchievements — filesCreated", () => {
  it("increments filesCreated when a file-edit event has created:true", () => {
    const player = makePlayer();
    const event = {
      type: "file-edit" as const,
      occurredAt: new Date().toISOString(),
      metadata: { filePath: "src/foo.ts", linesAdded: 10, created: true },
    };
    const result = updateAchievements(player, event, makeDungeon());
    expect(result.filesCreated).toBe(1);
  });

  it("does not increment when created is false", () => {
    const player = makePlayer();
    const event = {
      type: "file-edit" as const,
      occurredAt: new Date().toISOString(),
      metadata: { filePath: "src/foo.ts", linesAdded: 5 },
    };
    const result = updateAchievements(player, event, makeDungeon());
    expect(result.filesCreated).toBe(0);
  });
});

describe("updateAchievements — bugsFixed", () => {
  it("increments bugsFixed when test-pass follows test-fail within 30 minutes", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const dungeon = makeDungeon({ "test-fail": tenMinutesAgo });
    const player = makePlayer();
    const event = {
      type: "test-pass" as const,
      occurredAt: new Date().toISOString(),
      metadata: {},
    };
    const result = updateAchievements(player, event, dungeon);
    expect(result.bugsFixed).toBe(1);
  });

  it("does not increment when test-fail was over 30 minutes ago", () => {
    const fortyMinutesAgo = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    const dungeon = makeDungeon({ "test-fail": fortyMinutesAgo });
    const player = makePlayer();
    const event = {
      type: "test-pass" as const,
      occurredAt: new Date().toISOString(),
      metadata: {},
    };
    const result = updateAchievements(player, event, dungeon);
    expect(result.bugsFixed).toBe(0);
  });

  it("does not increment when no prior test-fail", () => {
    const player = makePlayer();
    const event = {
      type: "test-pass" as const,
      occurredAt: new Date().toISOString(),
      metadata: {},
    };
    const result = updateAchievements(player, event, makeDungeon());
    expect(result.bugsFixed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// checkCleanSession
// ---------------------------------------------------------------------------

describe("checkCleanSession", () => {
  const sessionStart = "2026-04-06T10:00:00.000Z";
  const session = { startedAt: sessionStart };

  it("increments cleanSessions for a quality session with tests and no failures", () => {
    const dungeon = makeDungeon({
      "git-commit":  "2026-04-06T11:00:00.000Z",
      "test-pass":   "2026-04-06T11:05:00.000Z",
    });
    const player = makePlayer();
    const result = checkCleanSession(player, session, dungeon);
    expect(result.cleanSessions).toBe(1);
  });

  it("does not increment when there was a test failure", () => {
    const dungeon = makeDungeon({
      "git-commit":  "2026-04-06T11:00:00.000Z",
      "test-pass":   "2026-04-06T11:05:00.000Z",
      "test-fail":   "2026-04-06T10:55:00.000Z",
    });
    const player = makePlayer();
    const result = checkCleanSession(player, session, dungeon);
    expect(result.cleanSessions).toBe(0);
  });

  it("does not increment when there is no quality work (no commit/build)", () => {
    const dungeon = makeDungeon({
      "test-pass": "2026-04-06T11:05:00.000Z",
    });
    const player = makePlayer();
    const result = checkCleanSession(player, session, dungeon);
    expect(result.cleanSessions).toBe(0);
  });

  it("does not increment when events occurred before the session started", () => {
    const dungeon = makeDungeon({
      "git-commit":  "2026-04-06T09:00:00.000Z",  // before session
      "test-pass":   "2026-04-06T09:30:00.000Z",   // before session
    });
    const player = makePlayer();
    const result = checkCleanSession(player, session, dungeon);
    expect(result.cleanSessions).toBe(0);
  });

  it("accepts build-pass as quality work in place of commit", () => {
    const dungeon = makeDungeon({
      "build-pass":  "2026-04-06T11:00:00.000Z",
      "test-pass":   "2026-04-06T11:05:00.000Z",
    });
    const player = makePlayer();
    const result = checkCleanSession(player, session, dungeon);
    expect(result.cleanSessions).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getNewTitles / applyNewTitles
// ---------------------------------------------------------------------------

describe("getNewTitles", () => {
  it("awards first-blood on any XP earned", () => {
    const player = makePlayer({ totalXp: 1 });
    const titles = getNewTitles(player);
    expect(titles.some((t) => t.id === "first-blood")).toBe(true);
  });

  it("awards the-gamer once rank rises above E", () => {
    const player = makePlayer({ rank: "D", totalXp: 100 });
    const titles = getNewTitles(player);
    expect(titles.some((t) => t.id === "the-gamer")).toBe(true);
  });

  it("does not re-award a title already held", () => {
    const player = makePlayer({
      totalXp: 1,
      titles: [{ id: "first-blood", name: "First Blood", unlockedAt: new Date().toISOString() }],
    });
    const titles = getNewTitles(player);
    expect(titles.some((t) => t.id === "first-blood")).toBe(false);
  });
});

describe("applyNewTitles", () => {
  it("appends new titles to existing titles", () => {
    const player = makePlayer();
    const newTitle = { id: "first-blood", name: "First Blood", unlockedAt: new Date().toISOString() };
    const updated = applyNewTitles(player, [newTitle]);
    expect(updated.titles).toHaveLength(1);
    expect(updated.titles[0]?.id).toBe("first-blood");
  });

  it("sets activeTitle when player had none", () => {
    const player = makePlayer({ activeTitle: null });
    const newTitle = { id: "first-blood", name: "First Blood", unlockedAt: new Date().toISOString() };
    const updated = applyNewTitles(player, [newTitle]);
    expect(updated.activeTitle).toBe("First Blood");
  });

  it("preserves existing activeTitle when one is already set", () => {
    const existing = { id: "the-gamer", name: "The Gamer", unlockedAt: new Date().toISOString() };
    const player = makePlayer({ titles: [existing], activeTitle: "The Gamer" });
    const newTitle = { id: "first-blood", name: "First Blood", unlockedAt: new Date().toISOString() };
    const updated = applyNewTitles(player, [newTitle]);
    expect(updated.activeTitle).toBe("The Gamer");
  });
});
