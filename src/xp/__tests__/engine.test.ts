import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { XPEngine } from "../engine.js";
import { EVENT_AWARDS } from "../awards.js";
import { RANK_XP_THRESHOLDS } from "../ranks.js";
import { openPlayerStorage } from "../../storage/player.js";
import type { PlayerStorage } from "../../storage/player.js";
import type { XPEvent } from "../../events/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  type: XPEvent["type"],
  metadata: Record<string, unknown> = {},
): XPEvent {
  return { type, occurredAt: new Date().toISOString(), metadata };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let dir: string;
let playerStorage: PlayerStorage;
let engine: XPEngine;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-engine-test-"));
  playerStorage = openPlayerStorage(join(dir, "player.db"));
  engine = new XPEngine(playerStorage);
});

afterEach(() => {
  playerStorage.close();
  rmSync(dir, { recursive: true });
});

// ---------------------------------------------------------------------------
// XP awarding
// ---------------------------------------------------------------------------

describe("handle — XP awarding", () => {
  it("awards base XP for a file-edit event", () => {
    const result = engine.handle(makeEvent("file-edit"));
    expect(result.xpAwarded).toBe(EVENT_AWARDS["file-edit"].baseXp);
    expect(result.updatedPlayer.totalXp).toBe(EVENT_AWARDS["file-edit"].baseXp);
    expect(result.updatedPlayer.rankXp).toBe(EVENT_AWARDS["file-edit"].baseXp);
  });

  it("accumulates XP across multiple events", () => {
    engine.handle(makeEvent("file-edit"));
    engine.handle(makeEvent("git-commit"));
    const { updatedPlayer } = engine.handle(makeEvent("test-pass"));

    const expected =
      EVENT_AWARDS["file-edit"].baseXp +
      EVENT_AWARDS["git-commit"].baseXp +
      EVENT_AWARDS["test-pass"].baseXp;
    expect(updatedPlayer.totalXp).toBe(expected);
  });

  it("applies the commit message multiplier for a long message", () => {
    const longMessage = "a".repeat(72);
    const result = engine.handle(
      makeEvent("git-commit", { commitMessage: longMessage }),
    );
    const expected = Math.round(EVENT_AWARDS["git-commit"].baseXp * 1.25);
    expect(result.xpAwarded).toBe(expected);
  });

  it("applies no multiplier when commit message metadata is absent", () => {
    const result = engine.handle(makeEvent("git-commit"));
    expect(result.xpAwarded).toBe(EVENT_AWARDS["git-commit"].baseXp);
  });

  it("applies the session-end multiplier for a 2-hour session", () => {
    const result = engine.handle(
      makeEvent("session-end", { sessionMinutes: 120 }),
    );
    const expected = Math.round(EVENT_AWARDS["session-end"].baseXp * 2.0);
    expect(result.xpAwarded).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Stat deltas
// ---------------------------------------------------------------------------

describe("handle — stat deltas", () => {
  it("increments strength and agility for file-edit", () => {
    const { updatedPlayer } = engine.handle(makeEvent("file-edit"));
    expect(updatedPlayer.stats.strength).toBe(1);
    expect(updatedPlayer.stats.agility).toBe(1);
    expect(updatedPlayer.stats.intelligence).toBe(0);
  });

  it("increments intelligence and sense for test-pass", () => {
    const { updatedPlayer } = engine.handle(makeEvent("test-pass"));
    expect(updatedPlayer.stats.intelligence).toBe(2);
    expect(updatedPlayer.stats.sense).toBe(2);
  });

  it("increments endurance for build-fail", () => {
    const { updatedPlayer } = engine.handle(makeEvent("build-fail"));
    expect(updatedPlayer.stats.endurance).toBe(1);
  });

  it("accumulates stats across events", () => {
    engine.handle(makeEvent("file-edit"));  // strength+1, agility+1
    engine.handle(makeEvent("test-pass"));  // intelligence+2, sense+2
    const { updatedPlayer } = engine.handle(makeEvent("git-commit")); // strength+2, agility+2

    expect(updatedPlayer.stats.strength).toBe(3);
    expect(updatedPlayer.stats.agility).toBe(3);
    expect(updatedPlayer.stats.intelligence).toBe(2);
    expect(updatedPlayer.stats.sense).toBe(2);
    expect(updatedPlayer.stats.endurance).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Rank progression
// ---------------------------------------------------------------------------

describe("handle — rank progression", () => {
  it("does not rank up when XP is below the threshold", () => {
    const { rankUp } = engine.handle(makeEvent("file-edit"));
    expect(rankUp).toBeNull();
    expect(playerStorage.read()?.rank).toBe("E");
  });

  it("returns a rankUp event when the threshold is crossed", () => {
    // Manually set rankXp just below the E threshold
    const player = playerStorage.readOrCreate("Hunter");
    playerStorage.write({
      ...player,
      rankXp: RANK_XP_THRESHOLDS["E"] - EVENT_AWARDS["git-commit"].baseXp,
    });

    const { rankUp, updatedPlayer } = engine.handle(makeEvent("git-commit"));

    expect(rankUp).not.toBeNull();
    expect(rankUp?.from).toBe("E");
    expect(rankUp?.to).toBe("D");
    expect(updatedPlayer.rank).toBe("D");
  });

  it("carries excess XP over into the new rank", () => {
    const threshold = RANK_XP_THRESHOLDS["E"];
    const player = playerStorage.readOrCreate("Hunter");
    // Set rankXp so that a git-commit award overshoots by exactly 10
    playerStorage.write({
      ...player,
      rankXp: threshold - EVENT_AWARDS["git-commit"].baseXp + 10,
    });

    const { updatedPlayer } = engine.handle(makeEvent("git-commit"));
    expect(updatedPlayer.rank).toBe("D");
    expect(updatedPlayer.rankXp).toBe(10);
  });

  it("sets xpToNextRank to the new rank's threshold after rank-up", () => {
    const player = playerStorage.readOrCreate("Hunter");
    playerStorage.write({
      ...player,
      rankXp: RANK_XP_THRESHOLDS["E"] - 1,
    });
    engine.handle(makeEvent("file-edit")); // pushes over threshold

    expect(playerStorage.read()?.xpToNextRank).toBe(RANK_XP_THRESHOLDS["D"]);
  });

  it("does not advance past max rank", () => {
    const player = playerStorage.readOrCreate("Hunter");
    playerStorage.write({
      ...player,
      rank: "National-Level Programmer",
      rankXp: RANK_XP_THRESHOLDS["National-Level Programmer"] - 1,
      xpToNextRank: RANK_XP_THRESHOLDS["National-Level Programmer"],
    });

    const { rankUp, updatedPlayer } = engine.handle(makeEvent("git-commit"));
    expect(rankUp).toBeNull();
    expect(updatedPlayer.rank).toBe("National-Level Programmer");
  });

  it("caps rankXp at the threshold for max rank hunters", () => {
    const player = playerStorage.readOrCreate("Hunter");
    const cap = RANK_XP_THRESHOLDS["National-Level Programmer"];
    playerStorage.write({
      ...player,
      rank: "National-Level Programmer",
      rankXp: cap - 1,
      xpToNextRank: cap,
    });

    const { updatedPlayer } = engine.handle(makeEvent("git-commit"));
    expect(updatedPlayer.rankXp).toBeLessThanOrEqual(cap);
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe("handle — persistence", () => {
  it("persists updated state so the next read reflects the changes", () => {
    engine.handle(makeEvent("git-commit"));
    const stored = playerStorage.read();
    expect(stored?.totalXp).toBe(EVENT_AWARDS["git-commit"].baseXp);
  });

  it("updates lastActiveAt to the event's occurredAt timestamp", () => {
    const occurredAt = "2026-01-01T12:00:00.000Z";
    engine.handle({ type: "git-commit", occurredAt, metadata: {} });
    expect(playerStorage.read()?.lastActiveAt).toBe(occurredAt);
  });
});

// ---------------------------------------------------------------------------
// asHandler integration
// ---------------------------------------------------------------------------

describe("asHandler", () => {
  it("returns a function that delegates to handle", () => {
    const handler = engine.asHandler();
    handler(makeEvent("git-commit"));
    expect(playerStorage.read()?.totalXp).toBe(EVENT_AWARDS["git-commit"].baseXp);
  });
});
