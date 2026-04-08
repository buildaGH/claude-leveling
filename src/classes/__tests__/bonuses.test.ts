import { describe, expect, it } from "vitest";
import { getClassBonus } from "../bonuses.js";
import { HUNTER_CLASSES } from "../../schema.js";
import { XP_EVENT_TYPES } from "../../events/types.js";

describe("getClassBonus", () => {
  it("returns 1.0 for Unclassed on any event", () => {
    for (const eventType of XP_EVENT_TYPES) {
      expect(getClassBonus("Unclassed", eventType)).toBe(1.0);
    }
  });

  it("returns a value > 1.0 for Architect on build-pass", () => {
    expect(getClassBonus("Architect", "build-pass")).toBeGreaterThan(1.0);
  });

  it("returns a value > 1.0 for Shadow Scout on bash-command", () => {
    expect(getClassBonus("Shadow Scout", "bash-command")).toBeGreaterThan(1.0);
  });

  it("returns a value > 1.0 for Assassin on test-pass", () => {
    expect(getClassBonus("Assassin", "test-pass")).toBeGreaterThan(1.0);
  });

  it("returns a value > 1.0 for Berserker on git-commit", () => {
    expect(getClassBonus("Berserker", "git-commit")).toBeGreaterThan(1.0);
  });

  it("returns a value > 1.0 for Sage on agent-spawn", () => {
    expect(getClassBonus("Sage", "agent-spawn")).toBeGreaterThan(1.0);
  });

  it("returns a value > 1.0 for Necromancer on test-pass", () => {
    expect(getClassBonus("Necromancer", "test-pass")).toBeGreaterThan(1.0);
  });

  it("returns 1.0 for events not in a class's bonus map", () => {
    // Architect has no bonus for session-end
    expect(getClassBonus("Architect", "session-end")).toBe(1.0);
    // Berserker has no bonus for test-pass
    expect(getClassBonus("Berserker", "test-pass")).toBe(1.0);
  });

  it("defines a bonus for every class", () => {
    for (const cls of HUNTER_CLASSES) {
      // Every class should return a valid number (>= 1.0) for at least one event
      const bonuses = XP_EVENT_TYPES.map((t) => getClassBonus(cls, t));
      expect(bonuses.every((b) => b >= 1.0)).toBe(true);
    }
  });

  it("all bonuses are between 1.0 and 2.0 (sanity check on balance)", () => {
    for (const cls of HUNTER_CLASSES) {
      for (const eventType of XP_EVENT_TYPES) {
        const bonus = getClassBonus(cls, eventType);
        expect(bonus).toBeGreaterThanOrEqual(1.0);
        expect(bonus).toBeLessThanOrEqual(2.0);
      }
    }
  });
});
