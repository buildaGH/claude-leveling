import { describe, expect, it } from "vitest";
import { classifyHunter } from "../classifier.js";

/** Build a signal map with enough total activity to pass the minimum threshold. */
function signals(overrides: Record<string, number>): Record<string, number> {
  // Pad with neutral signals so total >= 50 without skewing any class score
  return { _padding: 50, ...overrides };
}

describe("classifyHunter", () => {
  it("returns Unclassed when total signals are below the minimum", () => {
    // total = 10, well below MIN_TOTAL_SIGNALS (50)
    expect(classifyHunter({ tsEdits: 10 })).toBe("Unclassed");
  });

  it("returns Unclassed when no class reaches the minimum score", () => {
    // All signals are neutral padding — no class-specific activity
    expect(classifyHunter({ _padding: 50 })).toBe("Unclassed");
  });

  it("classifies as Architect for heavy TypeScript edits", () => {
    expect(classifyHunter(signals({ tsEdits: 40, buildPasses: 10 }))).toBe("Architect");
  });

  it("classifies as Shadow Scout for heavy bash usage", () => {
    expect(classifyHunter(signals({ bashRuns: 40, commits: 10 }))).toBe("Shadow Scout");
  });

  it("classifies as Assassin for heavy test activity", () => {
    expect(classifyHunter(signals({ testRuns: 30, testPasses: 20 }))).toBe("Assassin");
  });

  it("classifies as Berserker for high commit velocity", () => {
    expect(classifyHunter(signals({ commits: 30, tsEdits: 5 }))).toBe("Berserker");
  });

  it("classifies as Sage for long, thoughtful commits and agent use", () => {
    expect(classifyHunter(signals({ longCommits: 15, agentSpawns: 10 }))).toBe("Sage");
  });

  it("classifies as Necromancer when failed tests dominate", () => {
    // Necromancer score = failures*4 + passes*1; Assassin score = runs*3 + passes*2
    // Need runs > 5*passes for Necromancer to win — use 30 runs, 5 passes
    // Necromancer: 25*4 + 5 = 105; Assassin: 30*3 + 5*2 = 100 → Necromancer wins
    expect(classifyHunter(signals({ testRuns: 30, testPasses: 5 }))).toBe("Necromancer");
  });

  it("picks the highest-scoring class when signals overlap", () => {
    // Lots of TypeScript edits should win over modest bash usage
    const result = classifyHunter(signals({ tsEdits: 50, bashRuns: 10 }));
    expect(result).toBe("Architect");
  });

  it("reclassifies correctly when signal balance shifts", () => {
    const tsHeavy = signals({ tsEdits: 50 });
    expect(classifyHunter(tsHeavy)).toBe("Architect");

    // Add enough test signals to tip the balance
    const testHeavy = { ...tsHeavy, testRuns: 80, testPasses: 75 };
    expect(classifyHunter(testHeavy)).toBe("Assassin");
  });
});
