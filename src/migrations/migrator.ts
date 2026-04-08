/**
 * migrator.ts — Core migration engine.
 *
 * `runMigrations` walks the registered migration chain from the stored version
 * to the target version, applying each transform in order. If the stored
 * version matches the target, the state is returned unchanged.
 *
 * Adding a new migration:
 *   1. Bump CURRENT_SCHEMA_VERSION in defaults.ts
 *   2. Add a Migration entry to PLAYER_MIGRATIONS or DUNGEON_MIGRATIONS
 *   3. Write a test that exercises the new transform
 *
 * Never edit or remove an existing migration — always add a new one.
 */

import type { Migration, RawState } from "./types.js";
import { compareVersions } from "./version.js";

/**
 * Apply all applicable migrations to bring `state` from its current
 * `schemaVersion` up to `targetVersion`.
 *
 * @throws if the chain cannot reach `targetVersion` (missing migration step)
 */
export function runMigrations(
  state: RawState,
  migrations: Migration[],
  targetVersion: string,
): RawState {
  const storedVersion =
    typeof state["schemaVersion"] === "string" ? state["schemaVersion"] : "0.0.0";

  if (compareVersions(storedVersion, targetVersion) === 0) return state;

  if (compareVersions(storedVersion, targetVersion) > 0) {
    throw new Error(
      `Cannot migrate: stored version ${storedVersion} is newer than target ${targetVersion}. ` +
        `This usually means an older version of claude-leveling is reading a file written by a newer version.`,
    );
  }

  // Sort migrations ascending by fromVersion so we can walk the chain.
  const sorted = [...migrations].sort((a, b) =>
    compareVersions(a.fromVersion, b.fromVersion),
  );

  let current = state;
  let currentVersion = storedVersion;

  while (compareVersions(currentVersion, targetVersion) < 0) {
    const step = sorted.find((m) => compareVersions(m.fromVersion, currentVersion) === 0);

    if (step === undefined) {
      throw new Error(
        `No migration found from version ${currentVersion}. ` +
          `The migration chain is incomplete — cannot reach ${targetVersion}.`,
      );
    }

    current = step.up(current);
    currentVersion = step.toVersion;
  }

  return current;
}

/**
 * Returns true if `state` requires migration to reach `targetVersion`.
 */
export function needsMigration(state: RawState, targetVersion: string): boolean {
  const stored =
    typeof state["schemaVersion"] === "string" ? state["schemaVersion"] : "0.0.0";
  return compareVersions(stored, targetVersion) !== 0;
}
