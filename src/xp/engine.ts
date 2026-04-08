/**
 * engine.ts — The XP engine.
 *
 * Registered as a handler on the EventBus. On each accepted event it:
 *   1. Loads the current PlayerState
 *   2. Computes the XP award (base × metadata multiplier × class bonus)
 *   3. Applies stat deltas
 *   4. Updates class signals and re-evaluates the Hunter's class
 *   5. Checks for rank-up (carrying over excess XP)
 *   6. Persists the updated state
 *   7. Returns a ProcessResult describing what happened
 *
 * The engine never touches the EventBus — that separation is intentional.
 * Hook code calls bus.process(); the bus calls engine.handle(); the engine
 * calls playerStorage.write(). Nothing else grants XP.
 */

import type { PlayerStorage } from "../storage/index.js";
import type { HunterStats, PlayerState, Rank } from "../schema.js";
import type { XPEvent } from "../events/types.js";
import { classifyHunter, extractSignals, getClassBonus, mergeSignals } from "../classes/index.js";
import { EVENT_AWARDS } from "./awards.js";
import { isMaxRank, nextRank, xpToNextRankFor } from "./ranks.js";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface RankUpEvent {
  from: Rank;
  to: Rank;
}

export interface ProcessResult {
  xpAwarded: number;
  rankUp: RankUpEvent | null;
  /** Set if the Hunter's class changed as a result of this event. */
  classChanged: boolean;
  /** Player state after this event was applied. */
  updatedPlayer: PlayerState;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class XPEngine {
  constructor(private readonly playerStorage: PlayerStorage) {}

  /**
   * Handle an accepted XPEvent. Safe to call directly in tests; in production
   * this is registered as a bus handler via `engine.asHandler()`.
   */
  handle(event: XPEvent): ProcessResult {
    const player = this.playerStorage.readOrCreate("Hunter");
    const award = EVENT_AWARDS[event.type];

    const eventMultiplier = award.multiplier?.(event.metadata) ?? 1.0;
    const classBonus = getClassBonus(player.hunterClass, event.type);
    const xpAwarded = Math.max(0, Math.round(award.baseXp * eventMultiplier * classBonus));

    const updatedStats = applyStatDeltas(player.stats, award.statDeltas);

    const updatedSignals = mergeSignals(player.classSignals, extractSignals(event));
    const newClass = classifyHunter(updatedSignals);
    const classChanged = newClass !== player.hunterClass;

    const { rank, rankXp, xpToNextRank, rankUp } = applyXp(
      player.rank,
      player.rankXp,
      player.xpToNextRank,
      xpAwarded,
    );

    const updatedPlayer: PlayerState = {
      ...player,
      rank,
      rankXp,
      xpToNextRank,
      totalXp: player.totalXp + xpAwarded,
      stats: updatedStats,
      classSignals: updatedSignals,
      hunterClass: newClass,
      lastActiveAt: event.occurredAt,
    };

    this.playerStorage.write(updatedPlayer);

    return { xpAwarded, rankUp, classChanged, updatedPlayer };
  }

  /**
   * Returns this engine as an XPEventHandler suitable for `bus.onAccepted()`.
   * The result is discarded; callers who want it should call `handle()` directly.
   */
  asHandler(): (event: XPEvent) => void {
    return (event) => { this.handle(event); };
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function applyStatDeltas(
  current: HunterStats,
  deltas: Partial<HunterStats>,
): HunterStats {
  return {
    intelligence: current.intelligence + (deltas.intelligence ?? 0),
    agility:      current.agility      + (deltas.agility      ?? 0),
    endurance:    current.endurance    + (deltas.endurance    ?? 0),
    sense:        current.sense        + (deltas.sense        ?? 0),
    strength:     current.strength     + (deltas.strength     ?? 0),
  };
}

/**
 * Apply XP to the current rank, handling single or cascading rank-ups.
 * Excess XP always carries over to the next rank.
 * Returns the first rank-up only — cascading rank-ups in one event are
 * theoretically possible at very low ranks but we surface just the first
 * to keep UX simple.
 */
function applyXp(
  rank: Rank,
  rankXp: number,
  xpToNextRank: number,
  xpAwarded: number,
): { rank: Rank; rankXp: number; xpToNextRank: number; rankUp: RankUpEvent | null } {
  let currentRank = rank;
  let currentRankXp = rankXp + xpAwarded;
  let currentXpToNext = xpToNextRank;
  let rankUp: RankUpEvent | null = null;

  while (currentRankXp >= currentXpToNext && !isMaxRank(currentRank)) {
    const next = nextRank(currentRank)!;
    if (rankUp === null) {
      rankUp = { from: currentRank, to: next };
    }
    currentRankXp -= currentXpToNext;
    currentRank = next;
    currentXpToNext = xpToNextRankFor(currentRank);
  }

  // At max rank, cap rankXp at the threshold so it doesn't grow unbounded.
  if (isMaxRank(currentRank)) {
    currentRankXp = Math.min(currentRankXp, currentXpToNext);
  }

  return {
    rank:        currentRank,
    rankXp:      currentRankXp,
    xpToNextRank: currentXpToNext,
    rankUp,
  };
}
