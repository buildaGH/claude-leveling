import type { ISODateString } from "../schema.js";

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

/**
 * Every signal that can flow through the XP event bus.
 * Hook integrations must map their raw payloads to one of these types —
 * the bus and XP engine never see raw Claude Code hook data directly.
 */
export const XP_EVENT_TYPES = [
  "file-edit",      // Edit tool: a file was written
  "bash-command",   // Bash tool: a generic shell command ran
  "git-commit",     // Bash tool: detected `git commit`
  "test-pass",      // Bash tool: test runner exited 0
  "test-fail",      // Bash tool: test runner exited non-zero
  "build-pass",     // Bash tool: build/typecheck exited 0
  "build-fail",     // Bash tool: build/typecheck exited non-zero
  "lint-pass",      // Bash tool: linter exited 0
  "session-end",    // Stop hook: conversation ended
  "agent-spawn",    // Agent tool: a sub-agent was launched
] as const;

export type XPEventType = (typeof XP_EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Event shape
// ---------------------------------------------------------------------------

export interface XPEvent {
  type: XPEventType;
  /** When the underlying action occurred (not when the event was processed). */
  occurredAt: ISODateString;
  /**
   * Arbitrary key/value metadata from the hook — file path, exit code, etc.
   * The XP engine reads this to compute context-sensitive rewards.
   */
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Bus result
// ---------------------------------------------------------------------------

export type RejectionReason = "rate-limited";

export type EventBusResult =
  | { accepted: true }
  | { accepted: false; reason: RejectionReason };

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/** Called synchronously for every event the bus accepts. */
export type XPEventHandler = (event: XPEvent) => void;
