/**
 * generator.ts — Daily and weekly quest generation.
 *
 * Quests are generated once per day/week and stored in DungeonState.quests.
 * The generator runs as part of session start (via the PostToolUse hook) and
 * is idempotent — calling it twice for the same day/week is a no-op.
 */

import type { DungeonStorage } from "../storage/index.js";
import type { PlayerStorage } from "../storage/index.js";
import type { LocalQuest, Rank } from "../schema.js";
import { DAILY_TEMPLATES, WEEKLY_TEMPLATES, buildBonusQuest } from "./templates.js";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export function todayStr(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** ISO date string for the most recent Monday (week start). */
export function weekStartStr(now = new Date()): string {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Refresh logic
// ---------------------------------------------------------------------------

/**
 * Expire any quests whose expiresAt has passed and status is still "active".
 * Returns the updated quests array.
 */
export function expireQuests(quests: LocalQuest[], now = new Date()): LocalQuest[] {
  const nowStr = now.toISOString();
  return quests.map((q) =>
    q.status === "active" && q.expiresAt <= nowStr
      ? { ...q, status: "expired", resolvedAt: nowStr }
      : q,
  );
}

/**
 * Check whether daily quests have already been generated for today.
 */
function hasDailyQuestsFor(quests: LocalQuest[], today: string): boolean {
  return quests.some((q) => q.frequency === "daily" && q.activeDate === today && q.status === "active");
}

/**
 * Check whether weekly quests have already been generated for this week.
 */
function hasWeeklyQuestsFor(quests: LocalQuest[], weekStart: string): boolean {
  return quests.some((q) => q.frequency === "weekly" && q.activeDate === weekStart && q.status === "active");
}

/**
 * Generate and persist daily + weekly quests if not already done for the
 * current period. Expires stale quests first.
 *
 * Called at the start of each PostToolUse hook invocation.
 */
export function refreshQuests(
  dungeonStorage: DungeonStorage,
  playerStorage: PlayerStorage,
  now = new Date(),
): { generated: LocalQuest[]; expired: number } {
  const dungeon = dungeonStorage.read();
  if (dungeon === null) return { generated: [], expired: 0 };

  const player = playerStorage.read();
  const rank: Rank = player?.rank ?? "E";

  const today     = todayStr(now);
  const weekStart = weekStartStr(now);

  // Expire stale quests first
  const afterExpiry = expireQuests(dungeon.quests, now);
  const expiredCount = afterExpiry.filter((q, i) => q.status === "expired" && dungeon.quests[i]?.status === "active").length;

  const generated: LocalQuest[] = [];

  // Daily quests — 3 per day, one from each daily archetype
  if (!hasDailyQuestsFor(afterExpiry, today)) {
    for (const template of DAILY_TEMPLATES) {
      generated.push(template.build(rank, today));
    }
  }

  // Weekly quests — one from each weekly archetype
  if (!hasWeeklyQuestsFor(afterExpiry, weekStart)) {
    for (const template of WEEKLY_TEMPLATES) {
      generated.push(template.build(rank, weekStart));
    }
  }

  if (generated.length > 0 || expiredCount > 0) {
    dungeonStorage.write({
      ...dungeon,
      quests: [...afterExpiry, ...generated],
    });
  }

  return { generated, expired: expiredCount };
}

/**
 * Randomly trigger a bonus quest. Call after a session starts with some
 * probability (e.g. 10% chance per new session).
 * Returns the new quest or null if not triggered.
 */
export function maybeSpawnBonusQuest(
  dungeonStorage: DungeonStorage,
  rank: Rank,
  now = new Date(),
  probability = 0.1,
): LocalQuest | null {
  if (Math.random() > probability) return null;

  const dungeon = dungeonStorage.read();
  if (dungeon === null) return null;

  // Don't spawn if one is already active
  const hasActive = dungeon.quests.some(
    (q) => q.archetype === "bonus-gate" && q.status === "active",
  );
  if (hasActive) return null;

  const quest = buildBonusQuest(rank, todayStr(now));
  dungeonStorage.write({ ...dungeon, quests: [...dungeon.quests, quest] });
  return quest;
}
