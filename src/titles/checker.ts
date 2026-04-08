/**
 * checker.ts — Title award logic and achievement counter updates.
 */

import type { PlayerState, Title } from "../schema.js";
import type { XPEvent } from "../events/types.js";
import type { DungeonState } from "../schema.js";
import { TITLE_DEFINITIONS } from "./definitions.js";

const BUG_FIX_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Achievement counter updates
// ---------------------------------------------------------------------------

/**
 * Return updated achievement counters based on the current XP event.
 * Does not write to storage — caller is responsible for persisting.
 */
export function updateAchievements(
  player: PlayerState,
  event: XPEvent,
  dungeon: DungeonState,
): PlayerState["achievements"] {
  const a = { ...player.achievements };

  // Files created (Write tool, flagged in parser)
  if (event.type === "file-edit" && event.metadata["created"] === true) {
    a.filesCreated += 1;
  }

  // Bugs fixed: test-pass following a test-fail within 30 minutes
  if (event.type === "test-pass") {
    const lastFail = dungeon.rateLimitState["test-fail"];
    if (typeof lastFail === "string") {
      const elapsed = new Date(event.occurredAt).getTime() - new Date(lastFail).getTime();
      if (elapsed >= 0 && elapsed <= BUG_FIX_WINDOW_MS) {
        a.bugsFixed += 1;
      }
    }
  }

  return a;
}

/**
 * Check for a clean session (commit/build-pass + test-pass, zero test-fails)
 * and increment cleanSessions if the session qualifies.
 */
export function checkCleanSession(
  player: PlayerState,
  session: { startedAt: string },
  dungeon: DungeonState,
): PlayerState["achievements"] {
  const a = { ...player.achievements };

  const after = (key: string): boolean => {
    const t = dungeon.rateLimitState[key];
    return typeof t === "string" && t >= session.startedAt;
  };

  const hadQualityWork  = after("git-commit") || after("build-pass");
  const hadTestPass     = after("test-pass");
  const hadTestFail     = after("test-fail");

  if (hadQualityWork && hadTestPass && !hadTestFail) {
    a.cleanSessions += 1;
  }

  return a;
}

// ---------------------------------------------------------------------------
// Title award
// ---------------------------------------------------------------------------

/**
 * Return any titles that should be newly awarded to the player.
 * Titles already in player.titles are excluded.
 */
export function getNewTitles(player: PlayerState): Title[] {
  const alreadyHas = new Set(player.titles.map((t) => t.id));
  const now = new Date().toISOString();

  return TITLE_DEFINITIONS
    .filter((def) => !alreadyHas.has(def.id) && def.condition(player))
    .map((def) => ({ id: def.id, name: def.name, unlockedAt: now }));
}

/**
 * Apply new titles to the player state. Sets activeTitle to the first
 * title if the player has none set yet.
 */
export function applyNewTitles(player: PlayerState, newTitles: Title[]): PlayerState {
  if (newTitles.length === 0) return player;
  const allTitles = [...player.titles, ...newTitles];
  const activeTitle = player.activeTitle ?? newTitles[0]?.name ?? null;
  return { ...player, titles: allTitles, activeTitle };
}
