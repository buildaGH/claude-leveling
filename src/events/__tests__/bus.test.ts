import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../bus.js";
import { COOLDOWNS_MS } from "../cooldowns.js";
import type { XPEvent } from "../types.js";
import { openDungeonStorage } from "../../storage/dungeon.js";
import type { DungeonStorage } from "../../storage/dungeon.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  type: XPEvent["type"],
  occurredAt: string = new Date().toISOString(),
  metadata: Record<string, unknown> = {},
): XPEvent {
  return { type, occurredAt, metadata };
}

function msLater(base: string, ms: number): string {
  return new Date(new Date(base).getTime() + ms).toISOString();
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

let dir: string;
let storage: DungeonStorage;
let bus: EventBus;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-bus-test-"));
  storage = openDungeonStorage(dir);
  bus = new EventBus(storage);
});

afterEach(() => {
  storage.close();
  rmSync(dir, { recursive: true });
});

// ---------------------------------------------------------------------------
// Basic acceptance
// ---------------------------------------------------------------------------

describe("process — basic acceptance", () => {
  it("accepts the first event of any type", () => {
    const result = bus.process(makeEvent("file-edit"));
    expect(result.accepted).toBe(true);
  });

  it("accepts events with no cooldown every time", () => {
    const t = new Date().toISOString();
    expect(COOLDOWNS_MS["git-commit"]).toBeNull();

    bus.process(makeEvent("git-commit", t));
    const second = bus.process(makeEvent("git-commit", msLater(t, 100)));
    expect(second.accepted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe("process — rate limiting", () => {
  it("rejects a second file-edit within the cooldown window", () => {
    const t = new Date().toISOString();
    bus.process(makeEvent("file-edit", t));

    const result = bus.process(makeEvent("file-edit", msLater(t, 5_000)));
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe("rate-limited");
  });

  it("accepts a file-edit after the cooldown window has elapsed", () => {
    const t = new Date().toISOString();
    bus.process(makeEvent("file-edit", t));

    const cooldown = COOLDOWNS_MS["file-edit"] as number;
    const result = bus.process(makeEvent("file-edit", msLater(t, cooldown + 1)));
    expect(result.accepted).toBe(true);
  });

  it("rate-limits each event type independently", () => {
    const t = new Date().toISOString();
    bus.process(makeEvent("file-edit", t));

    // bash-command has its own cooldown — not affected by file-edit
    const bashResult = bus.process(makeEvent("bash-command", msLater(t, 100)));
    expect(bashResult.accepted).toBe(true);
  });

  it("rate-limits lint-pass with its 30s window", () => {
    const t = new Date().toISOString();
    bus.process(makeEvent("lint-pass", t));

    const within = bus.process(makeEvent("lint-pass", msLater(t, 29_999)));
    expect(within.accepted).toBe(false);

    const after = bus.process(makeEvent("lint-pass", msLater(t, 30_001)));
    expect(after.accepted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Handler dispatch
// ---------------------------------------------------------------------------

describe("process — handler dispatch", () => {
  it("calls registered handlers for accepted events", () => {
    const handler = vi.fn();
    bus.onAccepted(handler);

    const event = makeEvent("git-commit");
    bus.process(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("does not call handlers for rate-limited events", () => {
    const handler = vi.fn();
    bus.onAccepted(handler);

    const t = new Date().toISOString();
    bus.process(makeEvent("file-edit", t));
    bus.process(makeEvent("file-edit", msLater(t, 1_000)));

    expect(handler).toHaveBeenCalledOnce();
  });

  it("calls multiple registered handlers in order", () => {
    const calls: string[] = [];
    bus.onAccepted(() => calls.push("first"));
    bus.onAccepted(() => calls.push("second"));

    bus.process(makeEvent("git-commit"));
    expect(calls).toEqual(["first", "second"]);
  });
});

// ---------------------------------------------------------------------------
// Persistence (cooldown survives across bus instances)
// ---------------------------------------------------------------------------

describe("process — cooldown persistence", () => {
  it("rate-limits across separate bus instances sharing the same storage", () => {
    const t = new Date().toISOString();
    bus.process(makeEvent("file-edit", t));

    // Simulate a new hook invocation: fresh bus, same storage
    const bus2 = new EventBus(storage);
    const result = bus2.process(makeEvent("file-edit", msLater(t, 1_000)));
    expect(result.accepted).toBe(false);
  });

  it("persists the last accepted timestamp in dungeon rateLimitState", () => {
    const t = new Date().toISOString();
    bus.process(makeEvent("git-commit", t));

    const dungeon = storage.read();
    expect(dungeon?.rateLimitState["git-commit"]).toBe(t);
  });

  it("does not persist a timestamp for rate-limited events", () => {
    const t = new Date().toISOString();
    bus.process(makeEvent("file-edit", t));

    const laterT = msLater(t, 500);
    bus.process(makeEvent("file-edit", laterT)); // rate-limited

    // Stored timestamp should still be the first event's time
    expect(storage.read()?.rateLimitState["file-edit"]).toBe(t);
  });
});

// ---------------------------------------------------------------------------
// Metadata passthrough
// ---------------------------------------------------------------------------

describe("process — metadata", () => {
  it("passes metadata through to handlers unchanged", () => {
    const handler = vi.fn();
    bus.onAccepted(handler);

    const event = makeEvent("bash-command", new Date().toISOString(), {
      exitCode: 0,
      command: "npm test",
    });
    bus.process(event);

    expect(handler.mock.calls[0]?.[0]?.metadata).toEqual({
      exitCode: 0,
      command: "npm test",
    });
  });
});
