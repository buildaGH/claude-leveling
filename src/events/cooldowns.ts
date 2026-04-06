import type { XPEventType } from "./types.js";

/**
 * Per-event-type cooldown in milliseconds.
 * null = no cooldown (every occurrence is processed).
 *
 * The goal is to prevent XP farming from rapid-fire tool use while still
 * rewarding every meaningful developer action.
 */
export const COOLDOWNS_MS: Record<XPEventType, number | null> = {
  // Edits are the most frequent hook event — a 10s window collapses bursts.
  "file-edit": 10_000,

  // Generic bash commands (non-specialised): short cooldown to catch rapid re-runs.
  "bash-command": 5_000,

  // Commits are always intentional and low-frequency — never rate-limit.
  "git-commit": null,

  // Test and build outcomes are natural checkpoints — always reward them.
  "test-pass": null,
  "test-fail": null,
  "build-pass": null,
  "build-fail": null,

  // Lint often reruns after every save in watch mode — 30s window.
  "lint-pass": 30_000,

  // Session end fires once per conversation.
  "session-end": null,

  // Sub-agents can be spawned rapidly in a single response — 60s window.
  "agent-spawn": 60_000,
};
