import { describe, expect, it } from "vitest";
import { getNewShadows, applyNewShadows } from "../checker.js";
import { createPlayer } from "../../defaults.js";
import type { PlayerState } from "../../schema.js";

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { ...createPlayer("Hunter"), ...overrides };
}

describe("getNewShadows", () => {
  it("returns a shadow when its signal threshold is met", () => {
    const player = makePlayer({ classSignals: { tsEdits: 50 } });
    const shadows = getNewShadows(player);
    expect(shadows.some((s) => s.signalKey === "tsEdits")).toBe(true);
    expect(shadows.find((s) => s.signalKey === "tsEdits")?.name).toBe("TypeScript");
  });

  it("does not return a shadow below the threshold", () => {
    const player = makePlayer({ classSignals: { tsEdits: 49 } });
    const shadows = getNewShadows(player);
    expect(shadows.some((s) => s.signalKey === "tsEdits")).toBe(false);
  });

  it("does not return a shadow already summoned", () => {
    const alreadySummoned = {
      name: "TypeScript",
      signalKey: "tsEdits",
      addedAt: new Date().toISOString(),
      editCount: 50,
    };
    const player = makePlayer({
      classSignals: { tsEdits: 50 },
      shadowArmy: [alreadySummoned],
    });
    const shadows = getNewShadows(player);
    expect(shadows.some((s) => s.signalKey === "tsEdits")).toBe(false);
  });

  it("can return multiple shadows at once", () => {
    const player = makePlayer({ classSignals: { tsEdits: 50, goEdits: 30 } });
    const shadows = getNewShadows(player);
    expect(shadows.some((s) => s.signalKey === "tsEdits")).toBe(true);
    expect(shadows.some((s) => s.signalKey === "goEdits")).toBe(true);
  });

  it("records editCount from classSignals", () => {
    const player = makePlayer({ classSignals: { rustEdits: 35 } });
    const shadows = getNewShadows(player);
    const rust = shadows.find((s) => s.signalKey === "rustEdits");
    expect(rust?.editCount).toBe(35);
  });
});

describe("applyNewShadows", () => {
  it("appends new shadows to the army", () => {
    const player = makePlayer();
    const newShadow = {
      name: "TypeScript",
      signalKey: "tsEdits",
      addedAt: new Date().toISOString(),
      editCount: 50,
    };
    const updated = applyNewShadows(player, [newShadow]);
    expect(updated.shadowArmy).toHaveLength(1);
    expect(updated.shadowArmy[0]?.name).toBe("TypeScript");
  });

  it("returns the same player reference when no new shadows are provided", () => {
    const player = makePlayer();
    const updated = applyNewShadows(player, []);
    expect(updated).toBe(player);
  });
});
