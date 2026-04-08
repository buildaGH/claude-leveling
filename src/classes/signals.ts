/**
 * signals.ts — Class signal keys and event-to-signal extraction.
 *
 * Signals are lightweight counters accumulated on PlayerState.classSignals.
 * Each accepted XP event contributes zero or more signal increments depending
 * on its type and metadata. The classifier reads the totals to score classes.
 *
 * Metadata keys (populated by Phase 2 hooks):
 *   file-edit  → filePath: string
 *   bash-command / git-commit → command: string
 *   git-commit → commitMessage: string
 */

import type { XPEvent } from "../events/types.js";

// ---------------------------------------------------------------------------
// Signal keys
// ---------------------------------------------------------------------------

export const CLASS_SIGNAL_KEYS = [
  "tsEdits",      // .ts / .tsx file edits
  "jsEdits",      // .js / .jsx file edits
  "pyEdits",      // .py file edits
  "rustEdits",    // .rs file edits
  "goEdits",      // .go file edits
  "bashRuns",     // generic bash commands (non-git)
  "testRuns",     // test-pass + test-fail combined
  "testPasses",   // test-pass only
  "commits",      // git-commit events
  "longCommits",  // commits with message length >= 30 chars
  "buildPasses",  // build-pass events
  "agentSpawns",  // agent-spawn events
] as const;

export type ClassSignalKey = (typeof CLASS_SIGNAL_KEYS)[number];

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * Returns the signal increments contributed by a single XP event.
 * Returns an empty object if the event produces no class signals.
 */
export function extractSignals(event: XPEvent): Partial<Record<ClassSignalKey, number>> {
  const inc: Partial<Record<ClassSignalKey, number>> = {};

  switch (event.type) {
    case "file-edit": {
      const path = event.metadata["filePath"];
      if (typeof path === "string") {
        const ext = path.split(".").pop()?.toLowerCase() ?? "";
        if (ext === "ts" || ext === "tsx") inc.tsEdits = 1;
        else if (ext === "js" || ext === "jsx") inc.jsEdits = 1;
        else if (ext === "py") inc.pyEdits = 1;
        else if (ext === "rs") inc.rustEdits = 1;
        else if (ext === "go") inc.goEdits = 1;
      }
      break;
    }

    case "bash-command":
      inc.bashRuns = 1;
      break;

    case "git-commit": {
      inc.commits = 1;
      const msg = event.metadata["commitMessage"];
      if (typeof msg === "string" && msg.length >= 30) {
        inc.longCommits = 1;
      }
      break;
    }

    case "test-pass":
      inc.testRuns = 1;
      inc.testPasses = 1;
      break;

    case "test-fail":
      inc.testRuns = 1;
      break;

    case "build-pass":
      inc.buildPasses = 1;
      break;

    case "agent-spawn":
      inc.agentSpawns = 1;
      break;

    // build-fail, lint-pass, session-end produce no class signals
  }

  return inc;
}

/**
 * Merge signal increments into an existing signal map, returning a new map.
 */
export function mergeSignals(
  current: Record<string, number>,
  increments: Partial<Record<ClassSignalKey, number>>,
): Record<string, number> {
  const next = { ...current };
  for (const [key, delta] of Object.entries(increments) as [ClassSignalKey, number][]) {
    next[key] = (next[key] ?? 0) + delta;
  }
  return next;
}

/** Sum all signal values to get total activity. */
export function totalSignals(signals: Record<string, number>): number {
  return Object.values(signals).reduce((sum, v) => sum + v, 0);
}

/** Read a signal value safely (returns 0 if absent). */
export function sig(signals: Record<string, number>, key: ClassSignalKey): number {
  return signals[key] ?? 0;
}
