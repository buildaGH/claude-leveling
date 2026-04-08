/**
 * caps.ts — Session XP caps per rank.
 *
 * Caps prevent XP farming within a single session. Quality checkpoint events
 * (git-commit, test-pass, build-pass, lint-pass) bypass the cap entirely —
 * they represent real work and should always be rewarded.
 *
 * Cap enforcement happens in the hook entry points before calling the bus,
 * keeping the bus and engine free of session-level concerns.
 */

import type { Rank } from "../schema.js";
import type { XPEventType } from "../events/types.js";

export const SESSION_XP_CAPS: Record<Rank, number> = {
  E:                             200,
  D:                             400,
  C:                             700,
  B:                           1_200,
  A:                           2_000,
  S:                           3_500,
  "National-Level Programmer":  5_000,
};

/**
 * Event types that bypass the session XP cap.
 * These are quality checkpoints — intentional, low-frequency developer actions.
 */
export const CAP_BYPASS_TYPES: ReadonlySet<XPEventType> = new Set<XPEventType>([
  "git-commit",
  "test-pass",
  "build-pass",
  "lint-pass",
]);

export function isCapped(
  eventType: XPEventType,
  sessionXpEarned: number,
  rank: Rank,
): boolean {
  if (CAP_BYPASS_TYPES.has(eventType)) return false;
  return sessionXpEarned >= SESSION_XP_CAPS[rank];
}
