/**
 * ranks.ts — Rank ladder, XP thresholds, and stat growth curves.
 *
 * Rank is global (follows the Hunter, not the project).
 * XP thresholds define how much rankXp is needed to advance to the next rank.
 * Stat growth curves define the expected stat totals at each rank — used for
 * display (e.g. "Intelligence 340 / ~500 for B-rank") not for gating.
 */

import { RANKS } from "../schema.js";
import type { HunterStats, Rank } from "../schema.js";

// ---------------------------------------------------------------------------
// Rank order
// ---------------------------------------------------------------------------

export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function nextRank(rank: Rank): Rank | null {
  const idx = rankIndex(rank);
  return idx < RANKS.length - 1 ? (RANKS[idx + 1] ?? null) : null;
}

export function isMaxRank(rank: Rank): boolean {
  return nextRank(rank) === null;
}

// ---------------------------------------------------------------------------
// XP thresholds (rankXp needed to advance to the next rank)
// ---------------------------------------------------------------------------

/**
 * Each value is the amount of rank-scoped XP required to advance.
 * Excess XP from crossing a threshold carries over to the next rank.
 */
export const RANK_XP_THRESHOLDS: Record<Rank, number> = {
  E:                           1_000,
  D:                           3_000,
  C:                           7_500,
  B:                          15_000,
  A:                          30_000,
  S:                          60_000,
  "National-Level Programmer": Infinity, // max rank — no further advancement
};

export function xpToNextRankFor(rank: Rank): number {
  return RANK_XP_THRESHOLDS[rank];
}

// ---------------------------------------------------------------------------
// Stat growth curves
// ---------------------------------------------------------------------------

/**
 * Expected cumulative stat totals at each rank.
 * These are soft benchmarks used for display, not hard requirements.
 * A Hunter could be A-rank with low Intelligence if they never run lint —
 * the system rewards what you actually do.
 */
export const STAT_CURVES: Record<Rank, HunterStats> = {
  E: {
    intelligence: 20,
    agility:      20,
    endurance:    15,
    sense:        15,
    strength:     20,
  },
  D: {
    intelligence:  80,
    agility:       80,
    endurance:     60,
    sense:         60,
    strength:      80,
  },
  C: {
    intelligence:  220,
    agility:       220,
    endurance:     170,
    sense:         170,
    strength:      220,
  },
  B: {
    intelligence:  500,
    agility:       500,
    endurance:     380,
    sense:         380,
    strength:      500,
  },
  A: {
    intelligence:  1_000,
    agility:       1_000,
    endurance:     750,
    sense:         750,
    strength:      1_000,
  },
  S: {
    intelligence:  2_200,
    agility:       2_200,
    endurance:     1_650,
    sense:         1_650,
    strength:      2_200,
  },
  "National-Level Programmer": {
    intelligence:  5_000,
    agility:       5_000,
    endurance:     3_750,
    sense:         3_750,
    strength:      5_000,
  },
};
