import { describe, expect, it } from "vitest";
import { parsePostToolUse } from "../parser.js";
import type { PostToolUsePayload } from "../types.js";

function payload(
  tool_name: string,
  tool_input: Record<string, unknown>,
  tool_response: Partial<PostToolUsePayload["tool_response"]> = {},
): PostToolUsePayload {
  return { session_id: "sess-1", tool_name, tool_input, tool_response };
}

// ---------------------------------------------------------------------------
// Unsupported tools
// ---------------------------------------------------------------------------

describe("parsePostToolUse — unsupported tools", () => {
  it("returns null for Read", () => {
    expect(parsePostToolUse(payload("Read", { file_path: "foo.ts" }))).toBeNull();
  });

  it("returns null for Glob", () => {
    expect(parsePostToolUse(payload("Glob", { pattern: "**/*.ts" }))).toBeNull();
  });

  it("returns null for Grep", () => {
    expect(parsePostToolUse(payload("Grep", { pattern: "foo" }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edit tool
// ---------------------------------------------------------------------------

describe("parsePostToolUse — Edit", () => {
  it("returns file-edit event", () => {
    const result = parsePostToolUse(
      payload("Edit", {
        file_path: "src/index.ts",
        old_string: "foo\nbar",
        new_string: "foo\nbar\nbaz\nqux",
      }),
    );
    expect(result?.type).toBe("file-edit");
    expect(result?.metadata["filePath"]).toBe("src/index.ts");
    expect(result?.metadata["linesAdded"]).toBe(2); // 4 - 2
  });

  it("sets linesAdded to 0 when new is shorter than old", () => {
    const result = parsePostToolUse(
      payload("Edit", { file_path: "f.ts", old_string: "a\nb\nc", new_string: "a" }),
    );
    expect(result?.metadata["linesAdded"]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Write tool
// ---------------------------------------------------------------------------

describe("parsePostToolUse — Write", () => {
  it("returns file-edit event with total line count", () => {
    const result = parsePostToolUse(
      payload("Write", { file_path: "src/new.ts", content: "a\nb\nc" }),
    );
    expect(result?.type).toBe("file-edit");
    expect(result?.metadata["filePath"]).toBe("src/new.ts");
    expect(result?.metadata["linesAdded"]).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Agent tool
// ---------------------------------------------------------------------------

describe("parsePostToolUse — Agent", () => {
  it("returns agent-spawn event", () => {
    const result = parsePostToolUse(
      payload("Agent", { prompt: "do something", subagent_type: "general-purpose" }),
    );
    expect(result?.type).toBe("agent-spawn");
    expect(result?.metadata["subagentType"]).toBe("general-purpose");
  });

  it("defaults subagentType to 'generic'", () => {
    const result = parsePostToolUse(payload("Agent", { prompt: "do something" }));
    expect(result?.metadata["subagentType"]).toBe("generic");
  });
});

// ---------------------------------------------------------------------------
// Bash — git commit
// ---------------------------------------------------------------------------

describe("parsePostToolUse — Bash git commit", () => {
  it("returns git-commit for a successful git commit", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: 'git commit -m "Add feature"' }, { exit_code: 0 }),
    );
    expect(result?.type).toBe("git-commit");
    expect(result?.metadata["commitMessage"]).toBe("Add feature");
    expect(result?.metadata["fixup"]).toBe(false);
  });

  it("extracts fixup flag for fixup! commits", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: 'git commit -m "fixup! Previous commit"' }, { exit_code: 0 }),
    );
    expect(result?.metadata["fixup"]).toBe(true);
  });

  it("returns null for a failed git commit", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: "git commit -m \"msg\"" }, { exit_code: 1 }),
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Bash — test runners
// ---------------------------------------------------------------------------

describe("parsePostToolUse — Bash test runners", () => {
  const runners = [
    "npm test",
    "npm run test",
    "npx vitest",
    "vitest run",
    "jest",
    "pytest",
  ];

  for (const cmd of runners) {
    it(`classifies "${cmd}" exit 0 as test-pass`, () => {
      const result = parsePostToolUse(payload("Bash", { command: cmd }, { exit_code: 0 }));
      expect(result?.type).toBe("test-pass");
    });

    it(`classifies "${cmd}" exit 1 as test-fail`, () => {
      const result = parsePostToolUse(payload("Bash", { command: cmd }, { exit_code: 1 }));
      expect(result?.type).toBe("test-fail");
    });
  }
});

// ---------------------------------------------------------------------------
// Bash — build tools
// ---------------------------------------------------------------------------

describe("parsePostToolUse — Bash build tools", () => {
  it("classifies tsc --noEmit exit 0 as build-pass", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: "tsc --noEmit" }, { exit_code: 0 }),
    );
    expect(result?.type).toBe("build-pass");
  });

  it("classifies npm run build exit 1 as build-fail", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: "npm run build" }, { exit_code: 1 }),
    );
    expect(result?.type).toBe("build-fail");
  });
});

// ---------------------------------------------------------------------------
// Bash — lint tools
// ---------------------------------------------------------------------------

describe("parsePostToolUse — Bash lint", () => {
  it("classifies eslint exit 0 as lint-pass", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: "eslint src/" }, { exit_code: 0 }),
    );
    expect(result?.type).toBe("lint-pass");
  });

  it("returns null for a failing lint (noise suppressed)", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: "eslint src/" }, { exit_code: 1 }),
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Bash — exit code inference from output
// ---------------------------------------------------------------------------

describe("parsePostToolUse — exit code inference", () => {
  it("infers failure from FAILED in output when exit_code absent", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: "npm test" }, { output: "Tests FAILED: 3 errors" }),
    );
    expect(result?.type).toBe("test-fail");
  });

  it("infers success from clean output", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: "npm test" }, { output: "All tests passed" }),
    );
    expect(result?.type).toBe("test-pass");
  });
});

// ---------------------------------------------------------------------------
// Bash — generic commands
// ---------------------------------------------------------------------------

describe("parsePostToolUse — generic bash", () => {
  it("returns bash-command for unrecognised commands", () => {
    const result = parsePostToolUse(
      payload("Bash", { command: "ls -la" }, { exit_code: 0 }),
    );
    expect(result?.type).toBe("bash-command");
    expect(result?.metadata["command"]).toBe("ls -la");
  });

  it("returns null for an empty command", () => {
    expect(parsePostToolUse(payload("Bash", { command: "" }))).toBeNull();
  });
});
