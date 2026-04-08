/**
 * types.ts — Raw Claude Code hook payload types.
 *
 * These types represent the JSON Claude Code sends via stdin to hook scripts.
 * They are never exposed beyond the hooks module — parser.ts converts them
 * into XPEvents that the rest of the system understands.
 */

// ---------------------------------------------------------------------------
// PostToolUse
// ---------------------------------------------------------------------------

export interface BashToolInput {
  command: string;
  description?: string;
}

export interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
}

export interface WriteToolInput {
  file_path: string;
  content: string;
}

export interface AgentToolInput {
  prompt: string;
  subagent_type?: string;
  description?: string;
}

export interface ToolResponse {
  /** Combined stdout/stderr output from the tool. */
  output?: string;
  /** Explicit exit code — present for Bash on some Claude Code versions. */
  exit_code?: number;
  /** True if the tool was interrupted mid-execution. */
  interrupted?: boolean;
  /** Error message, if the tool itself failed (distinct from the command failing). */
  error?: string;
}

export interface PostToolUsePayload {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: ToolResponse;
}

// ---------------------------------------------------------------------------
// Stop
// ---------------------------------------------------------------------------

export interface StopPayload {
  session_id: string;
  /**
   * True when the Stop hook is triggered by an active stop request
   * (e.g. user abort or error) rather than a clean conversation end.
   */
  stop_hook_active: boolean;
}
