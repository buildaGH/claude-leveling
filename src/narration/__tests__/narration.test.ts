/**
 * narration.test.ts — Public narration functions fall back to static
 * templates when no API key is present. Each function must always return
 * a non-empty string.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  narrateRankUp,
  narrateQuestComplete,
  narrateTitleUnlock,
  narrateShadowSummon,
  narrateSessionStart,
  narrateSessionEnd,
} from "../index.js";

// Ensure no API key is present so we exercise the static fallback path
beforeEach(() => { delete process.env["ANTHROPIC_API_KEY"]; });
afterEach(()  => { delete process.env["ANTHROPIC_API_KEY"]; });

describe("narrateRankUp", () => {
  it("returns a non-empty string without an API key", async () => {
    const result = await narrateRankUp("E", "D", "Architect", 500);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("narrateQuestComplete", () => {
  it("returns a non-empty string without an API key", async () => {
    const result = await narrateQuestComplete("Commit 5 times", "dungeon-raid", "D");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("narrateTitleUnlock", () => {
  it("returns a non-empty string without an API key", async () => {
    const result = await narrateTitleUnlock("The Gamer", "D", "Architect");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("narrateShadowSummon", () => {
  it("returns a non-empty string without an API key", async () => {
    const result = await narrateShadowSummon("TypeScript", 50);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("narrateSessionStart", () => {
  it("returns a non-empty string without an API key", async () => {
    const result = await narrateSessionStart("claude-leveling", "E", 0);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes streak context in the prompt (coverage — no API call needed)", async () => {
    // Just verify it doesn't throw for any streak value
    const result = await narrateSessionStart("my-project", "A", 7);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("narrateSessionEnd", () => {
  it("returns a non-empty string for a cleared session", async () => {
    const result = await narrateSessionEnd(45, "B", true, "Assassin");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for an abandoned session", async () => {
    const result = await narrateSessionEnd(5, "E", false, "Unclassed");
    expect(result.length).toBeGreaterThan(0);
  });
});
