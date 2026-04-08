/**
 * registry.ts — Registered migrations for PlayerState and DungeonState.
 *
 * When making a breaking change:
 *   1. Bump CURRENT_SCHEMA_VERSION in defaults.ts
 *   2. Add a Migration entry below
 *   3. Add a test in __tests__/registry.test.ts
 *
 * Never edit or remove existing migrations.
 */

import type { Migration, RawState } from "./types.js";

export const PLAYER_MIGRATIONS: Migration[] = [
  {
    // Phase 3 — adds streak tracking fields
    fromVersion: "1.0.0",
    toVersion:   "1.1.0",
    up: (state: RawState): RawState => ({
      ...state,
      schemaVersion:    "1.1.0",
      streak:           0,
      longestStreak:    0,
      lastActiveDateStr: "",
    }),
  },
];

export const DUNGEON_MIGRATIONS: Migration[] = [
  {
    // Phase 3 — adds frequency and metadata fields to existing LocalQuest entries
    fromVersion: "1.0.0",
    toVersion:   "1.1.0",
    up: (state: RawState): RawState => {
      const quests = Array.isArray(state["quests"]) ? state["quests"] : [];
      return {
        ...state,
        schemaVersion: "1.1.0",
        quests: quests.map((q: RawState) => ({
          frequency: "daily",
          metadata:  {},
          ...q,
        })),
      };
    },
  },
];
