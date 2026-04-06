/**
 * awards.ts — Base XP and stat deltas awarded per event type.
 *
 * Each entry defines:
 *   baseXp        — XP granted when the event is accepted by the bus
 *   statDeltas    — how much each stat grows per accepted event
 *   multiplier()  — optional fn to scale baseXp from event metadata
 *                   (used in Phase 2 once hooks provide richer data)
 *
 * Stat philosophy (mirrors the TODO definitions):
 *   Intelligence — quality signals: lint, type checks, passing builds/tests
 *   Agility      — velocity: commits, files touched, bash commands
 *   Endurance    — sustained effort: session time, grinding through failures
 *   Sense        — catching bugs: test failures turning to passes
 *   Strength     — impact: feature size, commits, new files
 */

import type { HunterStats } from "../schema.js";
import type { XPEventType } from "../events/types.js";

export interface EventAward {
  baseXp: number;
  statDeltas: Partial<HunterStats>;
  /**
   * Optional metadata-driven multiplier. Return a value >= 0.
   * The final XP is Math.round(baseXp * multiplier(metadata)).
   * Defaults to 1.0 when omitted.
   */
  multiplier?: (metadata: Record<string, unknown>) => number;
}

export const EVENT_AWARDS: Record<XPEventType, EventAward> = {
  "file-edit": {
    baseXp: 5,
    statDeltas: { strength: 1, agility: 1 },
  },

  "bash-command": {
    baseXp: 3,
    statDeltas: { agility: 1 },
  },

  // Commits are the most meaningful unit of work — reward generously.
  "git-commit": {
    baseXp: 50,
    statDeltas: { strength: 2, agility: 2 },
    multiplier(metadata) {
      // Longer commit messages signal more considered work.
      const msg = metadata["commitMessage"];
      if (typeof msg !== "string" || msg.length === 0) return 1.0;
      if (msg.length >= 72) return 1.25;
      if (msg.length >= 30) return 1.1;
      return 1.0;
    },
  },

  // Passing tests are a quality gate — they earn Intelligence and Sense.
  "test-pass": {
    baseXp: 40,
    statDeltas: { intelligence: 2, sense: 2 },
  },

  // Failing tests still earn a little Sense — you're finding problems.
  "test-fail": {
    baseXp: 5,
    statDeltas: { sense: 1 },
  },

  "build-pass": {
    baseXp: 30,
    statDeltas: { intelligence: 2 },
  },

  // Failed builds earn Endurance — you're grinding through it.
  "build-fail": {
    baseXp: 2,
    statDeltas: { endurance: 1 },
  },

  "lint-pass": {
    baseXp: 20,
    statDeltas: { intelligence: 1 },
  },

  // Session end rewards sustained effort via Endurance.
  "session-end": {
    baseXp: 25,
    statDeltas: { endurance: 3 },
    multiplier(metadata) {
      // Longer sessions earn a bonus.
      const minutes = metadata["sessionMinutes"];
      if (typeof minutes !== "number") return 1.0;
      if (minutes >= 120) return 2.0;
      if (minutes >= 60)  return 1.5;
      if (minutes >= 30)  return 1.2;
      return 1.0;
    },
  },

  // Spawning agents shows advanced technique — modest Intelligence reward.
  "agent-spawn": {
    baseXp: 10,
    statDeltas: { intelligence: 1 },
  },
};
