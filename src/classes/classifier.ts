/**
 * classifier.ts — Scores accumulated signals to determine the Hunter's class.
 *
 * Each class defines a scoring function over the signal map. The classifier
 * picks the highest-scoring class provided:
 *   1. Total activity exceeds MIN_TOTAL_SIGNALS (avoids early misclassification)
 *   2. The winning class score exceeds MIN_CLASS_SCORE
 *
 * If neither condition is met, the Hunter remains "Unclassed".
 * Class assignments change as patterns shift — a Hunter who pivots from
 * TypeScript to heavy testing will eventually reclassify as Assassin.
 */

import type { HunterClass } from "../schema.js";
import { sig, totalSignals } from "./signals.js";

/**
 * Minimum total signal count before any class can be assigned.
 * Prevents a single commit from immediately labelling you "Berserker".
 */
const MIN_TOTAL_SIGNALS = 50;

/** Minimum score a class must reach to be assignable. */
const MIN_CLASS_SCORE = 30;

type SignalMap = Record<string, number>;
type ScoringFn = (signals: SignalMap) => number;

const CLASS_SCORES: Record<Exclude<HunterClass, "Unclassed">, ScoringFn> = {
  // Architect — heavy typed-language edits, clean builds
  Architect: (s) =>
    sig(s, "tsEdits") * 3 +
    sig(s, "buildPasses") * 2 +
    sig(s, "jsEdits") * 1,

  // Shadow Scout — lives in the terminal
  "Shadow Scout": (s) =>
    sig(s, "bashRuns") * 3 +
    sig(s, "commits") * 1,

  // Assassin — test-driven, high test volume
  Assassin: (s) =>
    sig(s, "testRuns") * 3 +
    sig(s, "testPasses") * 2,

  // Berserker — high commit velocity, edits everything
  Berserker: (s) =>
    sig(s, "commits") * 3 +
    (sig(s, "tsEdits") + sig(s, "jsEdits") + sig(s, "pyEdits")) * 1,

  // Sage — thoughtful commits, delegates to agents
  Sage: (s) =>
    sig(s, "longCommits") * 4 +
    sig(s, "agentSpawns") * 3,

  // Necromancer — frequently resurrects failing tests
  Necromancer: (s) => {
    const failedTests = sig(s, "testRuns") - sig(s, "testPasses");
    return failedTests * 4 + sig(s, "testPasses") * 1;
  },
};

/**
 * Determine the Hunter's class from accumulated signals.
 * Pure function — safe to call on every XP event.
 */
export function classifyHunter(signals: Record<string, number>): HunterClass {
  if (totalSignals(signals) < MIN_TOTAL_SIGNALS) return "Unclassed";

  let bestClass: HunterClass = "Unclassed";
  let bestScore = MIN_CLASS_SCORE - 1; // must exceed, not just reach

  for (const [cls, scoreFn] of Object.entries(CLASS_SCORES) as [
    Exclude<HunterClass, "Unclassed">,
    ScoringFn,
  ][]) {
    const score = scoreFn(signals);
    if (score > bestScore) {
      bestScore = score;
      bestClass = cls;
    }
  }

  return bestClass;
}
