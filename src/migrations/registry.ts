/**
 * registry.ts — Registered migrations for PlayerState and DungeonState.
 *
 * Both registries are empty at v1.0.0 — this is the initial schema.
 * When a breaking change is made to either interface:
 *
 *   1. Bump CURRENT_SCHEMA_VERSION in defaults.ts (e.g. "1.0.0" → "1.1.0")
 *   2. Add a Migration to the appropriate array below
 *   3. Add a test in __tests__/registry.test.ts covering the transform
 *
 * Example (adding classSignals to a hypothetical pre-1.0.0 PlayerState):
 *
 *   {
 *     fromVersion: "0.9.0",
 *     toVersion:   "1.0.0",
 *     up: (state) => ({ ...state, classSignals: {} }),
 *   }
 */

import type { Migration } from "./types.js";

export const PLAYER_MIGRATIONS: Migration[] = [
  // No migrations yet — 1.0.0 is the initial schema.
];

export const DUNGEON_MIGRATIONS: Migration[] = [
  // No migrations yet — 1.0.0 is the initial schema.
];
