/**
 * bus.ts — The XP event bus.
 *
 * All hooks feed events into this bus. The bus is the only thing that may
 * trigger XP grants — hooks never award XP directly.
 *
 * Because Claude Code hooks are one-shot processes (they fire and exit),
 * in-memory debounce state would be lost between invocations. Cooldown
 * timestamps are therefore persisted in the dungeon's `rateLimitState` map
 * via DungeonStorage, making rate-limiting durable across hook calls.
 */

import type { DungeonStorage } from "../storage/index.js";
import { COOLDOWNS_MS } from "./cooldowns.js";
import type { EventBusResult, XPEvent, XPEventHandler } from "./types.js";

export class EventBus {
  private readonly handlers: XPEventHandler[] = [];

  constructor(private readonly dungeonStorage: DungeonStorage) {}

  /**
   * Register a handler that will be called synchronously for every accepted
   * event. The XP engine registers itself here — nothing else should.
   */
  onAccepted(handler: XPEventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Submit an event for processing.
   *
   * 1. Loads current dungeon state to check the cooldown window.
   * 2. If the event type is within its cooldown period, drops the event.
   * 3. Otherwise, calls all registered handlers then persists the new
   *    cooldown timestamp.
   *
   * The dungeon state is read and written within the same call so that
   * concurrent hook invocations (e.g. two rapid edits) race on the SQLite
   * write rather than silently double-counting.
   */
  process(event: XPEvent): EventBusResult {
    const dungeon = this.dungeonStorage.readOrCreate(this.projectName());

    if (this.isRateLimited(event, dungeon.rateLimitState)) {
      return { accepted: false, reason: "rate-limited" };
    }

    // Call handlers before persisting so a handler crash doesn't silently
    // swallow the cooldown update.
    for (const handler of this.handlers) {
      handler(event);
    }

    this.dungeonStorage.write({
      ...dungeon,
      rateLimitState: {
        ...dungeon.rateLimitState,
        [event.type]: event.occurredAt,
      },
    });

    return { accepted: true };
  }

  private isRateLimited(
    event: XPEvent,
    rateLimitState: Record<string, string>,
  ): boolean {
    const cooldownMs = COOLDOWNS_MS[event.type];
    if (cooldownMs === null) return false;

    const lastStr = rateLimitState[event.type];
    if (lastStr === undefined) return false;

    const elapsed = new Date(event.occurredAt).getTime() - new Date(lastStr).getTime();
    return elapsed < cooldownMs;
  }

  private projectName(): string {
    // Fallback to cwd basename; the full init flow will pass the real name.
    return process.cwd().split("/").pop() ?? "unknown";
  }
}
