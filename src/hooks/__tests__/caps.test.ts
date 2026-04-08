import { describe, expect, it } from "vitest";
import { CAP_BYPASS_TYPES, isCapped, SESSION_XP_CAPS } from "../caps.js";
import { RANKS } from "../../schema.js";
import { XP_EVENT_TYPES } from "../../events/types.js";

describe("SESSION_XP_CAPS", () => {
  it("defines a cap for every rank", () => {
    for (const rank of RANKS) {
      expect(SESSION_XP_CAPS[rank]).toBeGreaterThan(0);
    }
  });

  it("caps increase with each rank", () => {
    const finite = RANKS.filter((r) => SESSION_XP_CAPS[r] !== Infinity);
    for (let i = 1; i < finite.length; i++) {
      expect(SESSION_XP_CAPS[finite[i]!]).toBeGreaterThan(SESSION_XP_CAPS[finite[i - 1]!]!);
    }
  });
});

describe("isCapped", () => {
  it("returns false when sessionXpEarned is below the cap", () => {
    expect(isCapped("file-edit", 0, "E")).toBe(false);
    expect(isCapped("file-edit", 199, "E")).toBe(false);
  });

  it("returns true when sessionXpEarned meets the cap", () => {
    expect(isCapped("file-edit", 200, "E")).toBe(true);
    expect(isCapped("file-edit", 300, "E")).toBe(true);
  });

  it("bypass types are never capped regardless of session XP", () => {
    for (const type of CAP_BYPASS_TYPES) {
      expect(isCapped(type, 99_999, "E")).toBe(false);
    }
  });

  it("all bypass types are valid XPEventTypes", () => {
    for (const type of CAP_BYPASS_TYPES) {
      expect(XP_EVENT_TYPES).toContain(type);
    }
  });
});
