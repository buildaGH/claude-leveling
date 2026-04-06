import { describe, expect, it } from "vitest";
import { RANKS } from "../../schema.js";
import {
  isMaxRank,
  nextRank,
  rankIndex,
  RANK_XP_THRESHOLDS,
  STAT_CURVES,
  xpToNextRankFor,
} from "../ranks.js";

describe("rankIndex", () => {
  it("returns 0 for E and ascending values for each rank", () => {
    expect(rankIndex("E")).toBe(0);
    expect(rankIndex("D")).toBe(1);
    expect(rankIndex("S")).toBe(5);
    expect(rankIndex("National-Level Programmer")).toBe(6);
  });
});

describe("nextRank", () => {
  it("returns the rank above the given one", () => {
    expect(nextRank("E")).toBe("D");
    expect(nextRank("A")).toBe("S");
    expect(nextRank("S")).toBe("National-Level Programmer");
  });

  it("returns null for the max rank", () => {
    expect(nextRank("National-Level Programmer")).toBeNull();
  });
});

describe("isMaxRank", () => {
  it("returns false for all ranks except the last", () => {
    for (const rank of RANKS.slice(0, -1)) {
      expect(isMaxRank(rank)).toBe(false);
    }
  });

  it("returns true for National-Level Programmer", () => {
    expect(isMaxRank("National-Level Programmer")).toBe(true);
  });
});

describe("RANK_XP_THRESHOLDS", () => {
  it("has an entry for every rank", () => {
    for (const rank of RANKS) {
      expect(RANK_XP_THRESHOLDS[rank]).toBeDefined();
    }
  });

  it("thresholds increase with each rank", () => {
    const finite = RANKS.filter((r) => RANK_XP_THRESHOLDS[r] !== Infinity);
    for (let i = 1; i < finite.length; i++) {
      expect(RANK_XP_THRESHOLDS[finite[i]!]).toBeGreaterThan(
        RANK_XP_THRESHOLDS[finite[i - 1]!]!,
      );
    }
  });

  it("National-Level Programmer threshold is Infinity", () => {
    expect(RANK_XP_THRESHOLDS["National-Level Programmer"]).toBe(Infinity);
  });
});

describe("xpToNextRankFor", () => {
  it("returns the threshold for the given rank", () => {
    expect(xpToNextRankFor("E")).toBe(1_000);
    expect(xpToNextRankFor("S")).toBe(60_000);
  });
});

describe("STAT_CURVES", () => {
  it("has a curve for every rank", () => {
    for (const rank of RANKS) {
      expect(STAT_CURVES[rank]).toBeDefined();
    }
  });

  it("all stat values are positive", () => {
    for (const rank of RANKS) {
      const curve = STAT_CURVES[rank]!;
      for (const val of Object.values(curve)) {
        expect(val).toBeGreaterThan(0);
      }
    }
  });

  it("intelligence curve increases monotonically across ranks", () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(STAT_CURVES[RANKS[i]!]!.intelligence).toBeGreaterThan(
        STAT_CURVES[RANKS[i - 1]!]!.intelligence,
      );
    }
  });
});
