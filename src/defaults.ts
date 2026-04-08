/**
 * defaults.ts — Factory functions for initial PlayerState and DungeonState.
 *
 * Used by `claude-level init` and the storage layer when creating new files.
 */

import { randomUUID } from "node:crypto";
import type { DungeonState, HunterStats, PlayerState } from "./schema.js";

export const CURRENT_SCHEMA_VERSION = "1.0.0";

export function emptyStats(): HunterStats {
  return {
    intelligence: 0,
    agility: 0,
    endurance: 0,
    sense: 0,
    strength: 0,
  };
}

export function createPlayer(name: string): PlayerState {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    hunterId: randomUUID(),
    name,
    rank: "E",
    totalXp: 0,
    rankXp: 0,
    xpToNextRank: 1000, // E → D threshold; will be managed by the XP engine
    stats: emptyStats(),
    hunterClass: "Unclassed",
    classSignals: {},
    titles: [],
    activeTitle: null,
    createdAt: now,
    lastActiveAt: now,
  };
}

export function createDungeon(projectName: string): DungeonState {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projectName,
    dungeonCleared: false,
    firstEnteredAt: now,
    sessions: [],
    quests: [],
    totalDungeonXp: 0,
    rateLimitState: {},
  };
}
