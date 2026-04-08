/**
 * bonuses.ts — Passive XP multipliers granted by each Hunter class.
 *
 * The class bonus is a second multiplier applied after the event's own
 * metadata multiplier: finalXp = round(baseXp × eventMultiplier × classBonus).
 *
 * Bonuses are intentionally modest (1.1–1.3) — they reward consistent
 * specialisation without making class mandatory for progression.
 */

import type { HunterClass } from "../schema.js";
import type { XPEventType } from "../events/types.js";

type BonusMap = Partial<Record<XPEventType, number>>;

const CLASS_BONUS_MAP: Record<HunterClass, BonusMap> = {
  Unclassed: {},

  // Architect excels at quality gates
  Architect: {
    "build-pass": 1.2,
    "lint-pass":  1.2,
    "test-pass":  1.1,
  },

  // Shadow Scout thrives in the terminal
  "Shadow Scout": {
    "bash-command": 1.2,
    "git-commit":   1.1,
  },

  // Assassin is rewarded for rigorous testing
  Assassin: {
    "test-pass": 1.3,
    "test-fail": 1.1, // finding failures is still work
  },

  // Berserker earns more from raw output
  Berserker: {
    "git-commit": 1.2,
    "file-edit":  1.1,
  },

  // Sage gains a small bonus everywhere — wisdom is universal
  Sage: {
    "git-commit":    1.15,
    "agent-spawn":   1.2,
    "session-end":   1.15,
    "bash-command":  1.05,
    "file-edit":     1.05,
    "build-pass":    1.05,
    "lint-pass":     1.05,
    "test-pass":     1.05,
    "test-fail":     1.05,
    "build-fail":    1.05,
  },

  // Necromancer's power comes from turning failure into success
  Necromancer: {
    "test-pass":  1.3, // redemption bonus
    "test-fail":  1.2, // suffering is the grind
    "build-fail": 1.2,
  },
};

/**
 * Returns the XP multiplier the Hunter's class grants for a given event type.
 * Returns 1.0 (no bonus) if the class has no entry for that event type.
 */
export function getClassBonus(hunterClass: HunterClass, eventType: XPEventType): number {
  return CLASS_BONUS_MAP[hunterClass][eventType] ?? 1.0;
}
