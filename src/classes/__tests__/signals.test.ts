import { describe, expect, it } from "vitest";
import { extractSignals, mergeSignals, sig, totalSignals } from "../signals.js";
import type { XPEvent } from "../../events/types.js";

function event(type: XPEvent["type"], metadata: Record<string, unknown> = {}): XPEvent {
  return { type, occurredAt: new Date().toISOString(), metadata };
}

describe("extractSignals", () => {
  it("extracts tsEdits for a .ts file edit", () => {
    expect(extractSignals(event("file-edit", { filePath: "src/foo.ts" }))).toEqual({ tsEdits: 1 });
  });

  it("extracts tsEdits for a .tsx file edit", () => {
    expect(extractSignals(event("file-edit", { filePath: "src/Foo.tsx" }))).toEqual({ tsEdits: 1 });
  });

  it("extracts jsEdits for a .js file", () => {
    expect(extractSignals(event("file-edit", { filePath: "index.js" }))).toEqual({ jsEdits: 1 });
  });

  it("extracts pyEdits for a .py file", () => {
    expect(extractSignals(event("file-edit", { filePath: "app.py" }))).toEqual({ pyEdits: 1 });
  });

  it("extracts rustEdits for a .rs file", () => {
    expect(extractSignals(event("file-edit", { filePath: "main.rs" }))).toEqual({ rustEdits: 1 });
  });

  it("extracts goEdits for a .go file", () => {
    expect(extractSignals(event("file-edit", { filePath: "main.go" }))).toEqual({ goEdits: 1 });
  });

  it("returns empty object for file-edit without filePath metadata", () => {
    expect(extractSignals(event("file-edit"))).toEqual({});
  });

  it("extracts bashRuns for bash-command", () => {
    expect(extractSignals(event("bash-command"))).toEqual({ bashRuns: 1 });
  });

  it("extracts commits for git-commit", () => {
    expect(extractSignals(event("git-commit"))).toEqual({ commits: 1 });
  });

  it("extracts longCommits for a commit message >= 30 chars", () => {
    const msg = "a".repeat(30);
    expect(extractSignals(event("git-commit", { commitMessage: msg }))).toEqual({
      commits: 1,
      longCommits: 1,
    });
  });

  it("does not extract longCommits for a short commit message", () => {
    expect(extractSignals(event("git-commit", { commitMessage: "fix" }))).toEqual({
      commits: 1,
    });
  });

  it("extracts testRuns and testPasses for test-pass", () => {
    expect(extractSignals(event("test-pass"))).toEqual({ testRuns: 1, testPasses: 1 });
  });

  it("extracts testRuns only for test-fail", () => {
    expect(extractSignals(event("test-fail"))).toEqual({ testRuns: 1 });
  });

  it("extracts buildPasses for build-pass", () => {
    expect(extractSignals(event("build-pass"))).toEqual({ buildPasses: 1 });
  });

  it("extracts agentSpawns for agent-spawn", () => {
    expect(extractSignals(event("agent-spawn"))).toEqual({ agentSpawns: 1 });
  });

  it("returns empty object for events that produce no class signals", () => {
    expect(extractSignals(event("build-fail"))).toEqual({});
    expect(extractSignals(event("lint-pass"))).toEqual({});
    expect(extractSignals(event("session-end"))).toEqual({});
  });
});

describe("mergeSignals", () => {
  it("adds increments to an empty map", () => {
    expect(mergeSignals({}, { tsEdits: 3 })).toEqual({ tsEdits: 3 });
  });

  it("accumulates values for existing keys", () => {
    expect(mergeSignals({ tsEdits: 5 }, { tsEdits: 2 })).toEqual({ tsEdits: 7 });
  });

  it("does not mutate the original map", () => {
    const original = { tsEdits: 1 };
    mergeSignals(original, { tsEdits: 1 });
    expect(original).toEqual({ tsEdits: 1 });
  });

  it("handles multiple keys in a single merge", () => {
    const result = mergeSignals({ tsEdits: 1 }, { tsEdits: 1, commits: 2 });
    expect(result).toEqual({ tsEdits: 2, commits: 2 });
  });
});

describe("totalSignals", () => {
  it("returns 0 for an empty map", () => {
    expect(totalSignals({})).toBe(0);
  });

  it("sums all values", () => {
    expect(totalSignals({ tsEdits: 3, commits: 2, testRuns: 5 })).toBe(10);
  });
});

describe("sig", () => {
  it("returns the value for a present key", () => {
    expect(sig({ tsEdits: 7 }, "tsEdits")).toBe(7);
  });

  it("returns 0 for a missing key", () => {
    expect(sig({}, "commits")).toBe(0);
  });
});
