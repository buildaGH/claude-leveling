import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openPlayerStorage } from "../../storage/player.js";
import type { PlayerStorage } from "../../storage/player.js";
import { isYesterday, updateStreak } from "../streak.js";

let dir: string;
let playerStorage: PlayerStorage;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-streak-test-"));
  playerStorage = openPlayerStorage(join(dir, "player.db"));
  playerStorage.readOrCreate("Hunter");
});

afterEach(() => {
  playerStorage.close();
  rmSync(dir, { recursive: true });
});

// ---------------------------------------------------------------------------
// isYesterday
// ---------------------------------------------------------------------------

describe("isYesterday", () => {
  it("returns true for consecutive dates", () => {
    expect(isYesterday("2026-04-07", "2026-04-08")).toBe(true);
  });

  it("returns false for same date", () => {
    expect(isYesterday("2026-04-08", "2026-04-08")).toBe(false);
  });

  it("returns false for a gap of two days", () => {
    expect(isYesterday("2026-04-06", "2026-04-08")).toBe(false);
  });

  it("returns false for an empty prev string", () => {
    expect(isYesterday("", "2026-04-08")).toBe(false);
  });

  it("handles month boundaries correctly", () => {
    expect(isYesterday("2026-03-31", "2026-04-01")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// updateStreak
// ---------------------------------------------------------------------------

describe("updateStreak", () => {
  it("starts streak at 1 on the first ever active day", () => {
    const result = updateStreak(playerStorage, new Date("2026-04-08T10:00:00.000Z"));
    expect(result.streak).toBe(1);
    expect(result.isNewDay).toBe(true);
  });

  it("increments streak on consecutive days", () => {
    updateStreak(playerStorage, new Date("2026-04-07T10:00:00.000Z"));
    const result = updateStreak(playerStorage, new Date("2026-04-08T10:00:00.000Z"));
    expect(result.streak).toBe(2);
  });

  it("resets streak to 1 after a missed day", () => {
    updateStreak(playerStorage, new Date("2026-04-06T10:00:00.000Z")); // day 1
    const result = updateStreak(playerStorage, new Date("2026-04-08T10:00:00.000Z")); // gap
    expect(result.streak).toBe(1);
  });

  it("does not change streak when called twice on the same day", () => {
    updateStreak(playerStorage, new Date("2026-04-08T10:00:00.000Z"));
    const result = updateStreak(playerStorage, new Date("2026-04-08T18:00:00.000Z"));
    expect(result.streak).toBe(1);
    expect(result.isNewDay).toBe(false);
  });

  it("tracks longest streak and never decreases it", () => {
    updateStreak(playerStorage, new Date("2026-04-06T10:00:00.000Z"));
    updateStreak(playerStorage, new Date("2026-04-07T10:00:00.000Z"));
    updateStreak(playerStorage, new Date("2026-04-08T10:00:00.000Z")); // streak = 3

    // Miss a day and reset
    updateStreak(playerStorage, new Date("2026-04-10T10:00:00.000Z")); // reset to 1

    const player = playerStorage.read();
    expect(player?.streak).toBe(1);
    expect(player?.longestStreak).toBe(3);
  });

  it("persists streak to player state", () => {
    updateStreak(playerStorage, new Date("2026-04-08T10:00:00.000Z"));
    expect(playerStorage.read()?.streak).toBe(1);
    expect(playerStorage.read()?.lastActiveDateStr).toBe("2026-04-08");
  });
});
