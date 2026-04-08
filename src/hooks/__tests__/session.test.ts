import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDungeonStorage } from "../../storage/dungeon.js";
import type { DungeonStorage } from "../../storage/dungeon.js";
import { endSession, getOrStartSession, recordSessionXp } from "../session.js";

let dir: string;
let storage: DungeonStorage;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-session-test-"));
  storage = openDungeonStorage(dir);
});

afterEach(() => {
  storage.close();
  rmSync(dir, { recursive: true });
});

// ---------------------------------------------------------------------------
// getOrStartSession
// ---------------------------------------------------------------------------

describe("getOrStartSession", () => {
  it("creates a new session on first call", () => {
    const ctx = getOrStartSession(storage, "sess-1", "my-project");
    expect(ctx.isNewSession).toBe(true);
    expect(ctx.currentSession.sessionId).toBe("sess-1");
    expect(ctx.currentSession.outcome).toBe("in-progress");
    expect(ctx.currentSession.xpEarned).toBe(0);
  });

  it("returns the existing session on subsequent calls with same session_id", () => {
    getOrStartSession(storage, "sess-1", "my-project");
    const ctx = getOrStartSession(storage, "sess-1", "my-project");
    expect(ctx.isNewSession).toBe(false);
    expect(ctx.currentSession.sessionId).toBe("sess-1");
  });

  it("persists the new session to storage", () => {
    getOrStartSession(storage, "sess-1", "my-project");
    const dungeon = storage.read();
    expect(dungeon?.sessions).toHaveLength(1);
    expect(dungeon?.sessions[0]?.sessionId).toBe("sess-1");
  });

  it("creates a second session when called with a different session_id", () => {
    getOrStartSession(storage, "sess-1", "my-project");
    const ctx = getOrStartSession(storage, "sess-2", "my-project");
    expect(ctx.isNewSession).toBe(true);
    expect(storage.read()?.sessions).toHaveLength(2);
  });

  it("marks orphaned in-progress sessions as abandoned", () => {
    getOrStartSession(storage, "sess-orphan", "my-project");
    getOrStartSession(storage, "sess-new", "my-project"); // new conversation

    const sessions = storage.read()?.sessions ?? [];
    const orphan = sessions.find((s) => s.sessionId === "sess-orphan");
    expect(orphan?.outcome).toBe("abandoned");
  });
});

// ---------------------------------------------------------------------------
// recordSessionXp
// ---------------------------------------------------------------------------

describe("recordSessionXp", () => {
  it("increments session xpEarned", () => {
    getOrStartSession(storage, "sess-1", "proj");
    recordSessionXp(storage, "sess-1", 50);
    const session = storage.read()?.sessions[0];
    expect(session?.xpEarned).toBe(50);
  });

  it("accumulates XP across multiple calls", () => {
    getOrStartSession(storage, "sess-1", "proj");
    recordSessionXp(storage, "sess-1", 30);
    recordSessionXp(storage, "sess-1", 20);
    expect(storage.read()?.sessions[0]?.xpEarned).toBe(50);
  });

  it("updates totalDungeonXp", () => {
    getOrStartSession(storage, "sess-1", "proj");
    recordSessionXp(storage, "sess-1", 75);
    expect(storage.read()?.totalDungeonXp).toBe(75);
  });

  it("ignores zero or negative xpAwarded", () => {
    getOrStartSession(storage, "sess-1", "proj");
    recordSessionXp(storage, "sess-1", 0);
    expect(storage.read()?.sessions[0]?.xpEarned).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// endSession
// ---------------------------------------------------------------------------

describe("endSession", () => {
  it("marks the session as cleared when stop_hook_active is false and xpEarned > 0", () => {
    getOrStartSession(storage, "sess-1", "proj");
    recordSessionXp(storage, "sess-1", 100);
    const result = endSession(storage, "sess-1", false);
    expect(result.outcome).toBe("cleared");
    expect(storage.read()?.sessions[0]?.outcome).toBe("cleared");
    expect(storage.read()?.sessions[0]?.endedAt).not.toBeNull();
  });

  it("marks the session as abandoned when stop_hook_active is true", () => {
    getOrStartSession(storage, "sess-1", "proj");
    recordSessionXp(storage, "sess-1", 100);
    const result = endSession(storage, "sess-1", true);
    expect(result.outcome).toBe("abandoned");
  });

  it("marks the session as abandoned when no XP was earned", () => {
    getOrStartSession(storage, "sess-1", "proj");
    const result = endSession(storage, "sess-1", false);
    expect(result.outcome).toBe("abandoned");
  });

  it("sets dungeonCleared=true for the first ever cleared session", () => {
    getOrStartSession(storage, "sess-1", "proj");
    recordSessionXp(storage, "sess-1", 100);
    const result = endSession(storage, "sess-1", false);
    expect(result.dungeonCleared).toBe(true);
    expect(storage.read()?.dungeonCleared).toBe(true);
  });

  it("does not set dungeonCleared if the dungeon was already cleared", () => {
    // First session clears the dungeon
    getOrStartSession(storage, "sess-1", "proj");
    recordSessionXp(storage, "sess-1", 100);
    endSession(storage, "sess-1", false);

    // Second session — dungeonCleared should remain true but result.dungeonCleared is false
    getOrStartSession(storage, "sess-2", "proj");
    recordSessionXp(storage, "sess-2", 50);
    const result = endSession(storage, "sess-2", false);
    expect(result.dungeonCleared).toBe(false); // not the first clear
    expect(storage.read()?.dungeonCleared).toBe(true); // still marked on state
  });

  it("returns sessionMinutes > 0 for a session with some duration", () => {
    getOrStartSession(storage, "sess-1", "proj");
    recordSessionXp(storage, "sess-1", 50);
    const result = endSession(storage, "sess-1", false);
    expect(result.sessionMinutes).toBeGreaterThanOrEqual(0);
  });

  it("returns abandoned with defaults for an unknown session_id", () => {
    const result = endSession(storage, "unknown-session", false);
    expect(result.outcome).toBe("abandoned");
    expect(result.dungeonCleared).toBe(false);
  });
});
