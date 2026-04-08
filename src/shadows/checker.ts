/**
 * checker.ts — Shadow army summon logic.
 *
 * After every XP event, checks whether any new shadows should be added
 * based on the current classSignals on PlayerState.
 */

import type { PlayerState, ShadowSoldier } from "../schema.js";
import { SHADOW_DEFINITIONS } from "./definitions.js";

/**
 * Return any shadows that should be newly summoned.
 * Shadows already in player.shadowArmy are excluded.
 */
export function getNewShadows(player: PlayerState): ShadowSoldier[] {
  const alreadySummoned = new Set(player.shadowArmy.map((s) => s.signalKey));
  const now = new Date().toISOString();

  return SHADOW_DEFINITIONS
    .filter((def) => {
      if (alreadySummoned.has(def.signalKey)) return false;
      const count = player.classSignals[def.signalKey] ?? 0;
      return count >= def.threshold;
    })
    .map((def) => ({
      name:      def.name,
      signalKey: def.signalKey,
      addedAt:   now,
      editCount: player.classSignals[def.signalKey] ?? 0,
    }));
}

/**
 * Apply new shadows to the player state.
 */
export function applyNewShadows(player: PlayerState, newShadows: ShadowSoldier[]): PlayerState {
  if (newShadows.length === 0) return player;
  return { ...player, shadowArmy: [...player.shadowArmy, ...newShadows] };
}
