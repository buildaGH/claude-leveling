/**
 * parser.ts — Translates raw Claude Code hook payloads into XPEvents.
 *
 * Returns null when the tool use carries no meaningful XP signal
 * (e.g. a Read or Glob call, or an unrecognised bash pattern with no metadata).
 */

import type { XPEvent, XPEventType } from "../events/types.js";
import type { PostToolUsePayload } from "./types.js";

// ---------------------------------------------------------------------------
// Bash command pattern matchers
// ---------------------------------------------------------------------------

const GIT_COMMIT_RE    = /^git\s+commit\b/;
const TEST_RUNNER_RE   = /^(npm\s+(run\s+)?test|npx?\s+(vitest|jest|mocha|tap|ava)|vitest|jest|mocha|pytest|go\s+test|cargo\s+test|bundle\s+exec\s+rspec)\b/;
const BUILD_TOOL_RE    = /^(npm\s+run\s+build|npx?\s+tsc|tsc(\s|$)|go\s+build|cargo\s+build|make\b)/;
const LINT_TOOL_RE     = /^(npx?\s+eslint|eslint|npx?\s+biome|biome\s+(check|lint)|ruff|oxlint|npx?\s+oxlint)\b/;
const TYPECHECK_RE     = /^(npx?\s+tsc\s+--noEmit|tsc\s+--noEmit)/;

// Patterns that suggest a non-zero exit even without an explicit exit_code.
const FAILURE_OUTPUT_RE = /\b(FAILED|FAIL|Error:|error TS\d|✗|× \d|\d+ (failed|failing|errors?))\b/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveExitCode(response: PostToolUsePayload["tool_response"]): number {
  // Prefer explicit exit_code if provided
  if (typeof response.exit_code === "number") return response.exit_code;
  // Fall back to output heuristics
  const out = response.output ?? "";
  if (FAILURE_OUTPUT_RE.test(out)) return 1;
  return 0;
}

function countLines(text: string): number {
  return text ? text.split("\n").length : 0;
}

function extractCommitMessage(command: string): string {
  // Extract from -m "..." or -m '...'
  const match = command.match(/-m\s+["']([^"']+)["']/);
  return match?.[1] ?? "";
}

// ---------------------------------------------------------------------------
// Per-tool parsers
// ---------------------------------------------------------------------------

function parseBash(payload: PostToolUsePayload): XPEvent | null {
  const input = payload.tool_input as { command?: unknown };
  const command = typeof input.command === "string" ? input.command.trim() : "";
  if (!command) return null;

  const exitCode = resolveExitCode(payload.tool_response);
  const success = exitCode === 0;
  const now = new Date().toISOString();

  // Typecheck is a subset of build — check it first
  if (TYPECHECK_RE.test(command)) {
    return {
      type: success ? "build-pass" : "build-fail",
      occurredAt: now,
      metadata: { command, exitCode },
    };
  }

  if (GIT_COMMIT_RE.test(command)) {
    if (!success) return null; // failed commits carry no signal
    const commitMessage = extractCommitMessage(command);
    const fixup = commitMessage.startsWith("fixup!") || commitMessage.startsWith("squash!");
    return {
      type: "git-commit",
      occurredAt: now,
      metadata: { command, commitMessage, fixup },
    };
  }

  if (TEST_RUNNER_RE.test(command)) {
    return {
      type: success ? "test-pass" : "test-fail",
      occurredAt: now,
      metadata: { command, exitCode },
    };
  }

  if (BUILD_TOOL_RE.test(command)) {
    return {
      type: success ? "build-pass" : "build-fail",
      occurredAt: now,
      metadata: { command, exitCode },
    };
  }

  if (LINT_TOOL_RE.test(command)) {
    if (!success) return null; // lint failures are noisy; skip for XP
    return {
      type: "lint-pass",
      occurredAt: now,
      metadata: { command },
    };
  }

  // Generic bash command
  return {
    type: "bash-command",
    occurredAt: now,
    metadata: { command, exitCode },
  };
}

function parseEdit(payload: PostToolUsePayload): XPEvent {
  const input = payload.tool_input as { file_path?: unknown; old_string?: unknown; new_string?: unknown };
  const filePath  = typeof input.file_path  === "string" ? input.file_path  : "";
  const oldString = typeof input.old_string === "string" ? input.old_string : "";
  const newString = typeof input.new_string === "string" ? input.new_string : "";
  const linesAdded = Math.max(0, countLines(newString) - countLines(oldString));
  return {
    type: "file-edit",
    occurredAt: new Date().toISOString(),
    metadata: { filePath, linesAdded },
  };
}

function parseWrite(payload: PostToolUsePayload): XPEvent {
  const input = payload.tool_input as { file_path?: unknown; content?: unknown };
  const filePath = typeof input.file_path === "string" ? input.file_path : "";
  const content  = typeof input.content   === "string" ? input.content   : "";
  return {
    type: "file-edit",
    occurredAt: new Date().toISOString(),
    // created:true distinguishes new-file writes from edits for achievement tracking
    metadata: { filePath, linesAdded: countLines(content), created: true },
  };
}

function parseAgent(payload: PostToolUsePayload): XPEvent {
  const input = payload.tool_input as { subagent_type?: unknown };
  const subagentType = typeof input.subagent_type === "string" ? input.subagent_type : "generic";
  return {
    type: "agent-spawn",
    occurredAt: new Date().toISOString(),
    metadata: { subagentType },
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Parse a PostToolUse payload into an XPEvent.
 * Returns null for tool types that carry no XP signal (Read, Glob, Grep, etc.).
 */
export function parsePostToolUse(payload: PostToolUsePayload): XPEvent | null {
  switch (payload.tool_name) {
    case "Bash":   return parseBash(payload);
    case "Edit":   return parseEdit(payload);
    case "Write":  return parseWrite(payload);
    case "Agent":  return parseAgent(payload);
    default:       return null;
  }
}
