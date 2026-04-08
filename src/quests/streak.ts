/**
 * streak.ts — Consecutive-day streak tracking.
 *
 * Called at the end of each session (Stop hook). Compares today's date
 * against the stored lastActiveDateStr to decide whether to increment,
 * maintain, or reset the streak.
 */

import type { PlayerStorage } from "../storage/index.js";
import { todayStr } from "./generator.js";

export interface StreakResult {
  streak: number;
  longestStreak: number;
  isNewDay: boolean;
}

/**
 * Update streak fields on PlayerState for the current session.
 * Returns the new streak values.
 */
export function updateStreak(
  playerStorage: PlayerStorage,
  now = new Date(),
): StreakResult {
  const player = playerStorage.read();
  if (player === null) return { streak: 0, longestStreak: 0, isNewDay: false };

  const today = todayStr(now);
  const last  = player.lastActiveDateStr;

  if (last === today) {
    // Already counted today — nothing changes
    return { streak: player.streak, longestStreak: player.longestStreak, isNewDay: false };
  }

  const isConsecutive = isYesterday(last, today);
  const newStreak = isConsecutive ? player.streak + 1 : 1;
  const newLongest = Math.max(newStreak, player.longestStreak);

  playerStorage.write({
    ...player,
    streak: newStreak,
    longestStreak: newLongest,
    lastActiveDateStr: today,
  });

  return { streak: newStreak, longestStreak: newLongest, isNewDay: true };
}

/**
 * Returns true if `prev` is exactly one calendar day before `curr`.
 * Both are YYYY-MM-DD strings in UTC.
 */
export function isYesterday(prev: string, curr: string): boolean {
  if (!prev) return false;
  const p = new Date(`${prev}T00:00:00.000Z`);
  const c = new Date(`${curr}T00:00:00.000Z`);
  return c.getTime() - p.getTime() === 86_400_000; // exactly 24 hours
}
