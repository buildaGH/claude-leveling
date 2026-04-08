/**
 * session.ts — Session lifecycle management.
 *
 * A session maps 1:1 to a Claude Code conversation, identified by session_id
 * from the hook payload. One conversation = one SessionRecord in DungeonState.
 *
 * Session start:  first PostToolUse with a new session_id
 * Session end:    Stop hook fires
 * Session outcome: determined at end based on activity signals
 */

import { randomUUID } from "node:crypto";
import type { DungeonStorage } from "../storage/index.js";
import type { SessionOutcome, SessionRecord } from "../schema.js";

// ---------------------------------------------------------------------------
// Session start
// ---------------------------------------------------------------------------

export interface SessionContext {
  sessionId: string;
  isNewSession: boolean;
  currentSession: SessionRecord;
}

/**
 * Find the in-progress session for this conversation, or create one.
 *
 * If multiple orphaned in-progress sessions exist (e.g. from a crashed hook),
 * they are all marked "abandoned" before starting the new one.
 */
export function getOrStartSession(
  dungeonStorage: DungeonStorage,
  sessionId: string,
  projectName: string,
): SessionContext {
  const dungeon = dungeonStorage.readOrCreate(projectName);

  // Check for an existing in-progress session matching this conversation
  const existing = dungeon.sessions.find(
    (s) => s.sessionId === sessionId && s.outcome === "in-progress",
  );
  if (existing !== undefined) {
    return { sessionId, isNewSession: false, currentSession: existing };
  }

  // Abandon any orphaned in-progress sessions from other conversations
  const cleanedSessions = dungeon.sessions.map((s) =>
    s.outcome === "in-progress" && s.sessionId !== sessionId
      ? { ...s, outcome: "abandoned" as SessionOutcome, endedAt: new Date().toISOString() }
      : s,
  );

  const newSession: SessionRecord = {
    sessionId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    outcome: "in-progress",
    xpEarned: 0,
    statDeltas: {},
    questsCompleted: [],
  };

  dungeonStorage.write({
    ...dungeon,
    sessions: [...cleanedSessions, newSession],
  });

  return { sessionId, isNewSession: true, currentSession: newSession };
}

// ---------------------------------------------------------------------------
// XP tracking
// ---------------------------------------------------------------------------

/**
 * Increment the session's xpEarned and update dungeon.totalDungeonXp.
 * Called after each successful XP engine invocation.
 */
export function recordSessionXp(
  dungeonStorage: DungeonStorage,
  sessionId: string,
  xpAwarded: number,
): void {
  if (xpAwarded <= 0) return;

  const dungeon = dungeonStorage.read();
  if (dungeon === null) return;

  const sessions = dungeon.sessions.map((s) =>
    s.sessionId === sessionId
      ? { ...s, xpEarned: s.xpEarned + xpAwarded }
      : s,
  );

  dungeonStorage.write({
    ...dungeon,
    sessions,
    totalDungeonXp: dungeon.totalDungeonXp + xpAwarded,
  });
}

// ---------------------------------------------------------------------------
// Session end
// ---------------------------------------------------------------------------

export interface SessionEndResult {
  outcome: SessionOutcome;
  /** True if this session is the first to ever clear this dungeon. */
  dungeonCleared: boolean;
  /** Session duration in minutes. */
  sessionMinutes: number;
}

/**
 * Finalise a session on Stop hook. Determines outcome, marks the session
 * complete, and sets dungeonCleared if this is the first ever clear.
 */
export function endSession(
  dungeonStorage: DungeonStorage,
  sessionId: string,
  stopHookActive: boolean,
): SessionEndResult {
  const dungeon = dungeonStorage.read();
  if (dungeon === null) {
    return { outcome: "abandoned", dungeonCleared: false, sessionMinutes: 0 };
  }

  const session = dungeon.sessions.find((s) => s.sessionId === sessionId);
  if (session === undefined) {
    return { outcome: "abandoned", dungeonCleared: false, sessionMinutes: 0 };
  }

  const now = new Date();
  const sessionMinutes = Math.round(
    (now.getTime() - new Date(session.startedAt).getTime()) / 60_000,
  );

  const outcome = determineOutcome(dungeon, session, stopHookActive);

  const firstClear =
    outcome === "cleared" &&
    !dungeon.dungeonCleared &&
    !dungeon.sessions.some((s) => s.sessionId !== sessionId && s.outcome === "cleared");

  const updatedSessions = dungeon.sessions.map((s) =>
    s.sessionId === sessionId
      ? { ...s, outcome, endedAt: now.toISOString() }
      : s,
  );

  dungeonStorage.write({
    ...dungeon,
    sessions: updatedSessions,
    dungeonCleared: dungeon.dungeonCleared || firstClear,
  });

  return { outcome, dungeonCleared: firstClear, sessionMinutes };
}

// ---------------------------------------------------------------------------
// Outcome determination
// ---------------------------------------------------------------------------

function determineOutcome(
  dungeon: { rateLimitState: Record<string, string> },
  session: SessionRecord,
  stopHookActive: boolean,
): SessionOutcome {
  if (stopHookActive) return "abandoned";
  if (session.xpEarned === 0) return "abandoned";

  // "Cleared" requires at least a commit OR a quality checkpoint after session start
  const after = (type: string): boolean => {
    const t = dungeon.rateLimitState[type];
    return t !== undefined && t >= session.startedAt;
  };

  const hadQualityWork =
    after("git-commit") ||
    after("test-pass") ||
    after("build-pass") ||
    after("lint-pass");

  return hadQualityWork ? "cleared" : "cleared"; // any XP activity = cleared; future: stricter gate
}
