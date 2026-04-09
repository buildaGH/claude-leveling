/**
 * templates.test.ts — Verify static narration templates are non-empty
 * and correctly branched for every event type and rank.
 */

import { describe, expect, it } from "vitest";
import {
  rankUpTemplate,
  questCompleteTemplate,
  titleUnlockTemplate,
  shadowSummonTemplate,
  sessionStartTemplate,
  sessionEndTemplate,
} from "../templates.js";
import { RANKS } from "../../schema.js";
import type { QuestArchetype, HunterClass } from "../../schema.js";

const ARCHETYPES: QuestArchetype[] = [
  "dungeon-raid",
  "hunt-the-weak",
  "speed-clear",
  "endurance-trial",
  "gate-siege",
  "bonus-gate",
];

describe("rankUpTemplate", () => {
  it("returns a non-empty string for every rank", () => {
    for (const rank of RANKS) {
      const result = rankUpTemplate(rank);
      expect(result.length, `rank ${rank}`).toBeGreaterThan(0);
    }
  });
});

describe("questCompleteTemplate", () => {
  it("returns a non-empty string for every archetype", () => {
    for (const archetype of ARCHETYPES) {
      const result = questCompleteTemplate(archetype);
      expect(result.length, `archetype ${archetype}`).toBeGreaterThan(0);
    }
  });
});

describe("titleUnlockTemplate", () => {
  it("returns a non-empty string", () => {
    expect(titleUnlockTemplate().length).toBeGreaterThan(0);
  });
});

describe("shadowSummonTemplate", () => {
  it("returns a non-empty string", () => {
    expect(shadowSummonTemplate().length).toBeGreaterThan(0);
  });
});

describe("sessionStartTemplate", () => {
  it("returns a non-empty string", () => {
    expect(sessionStartTemplate().length).toBeGreaterThan(0);
  });
});

describe("sessionEndTemplate", () => {
  it("returns a non-empty string for a cleared session", () => {
    expect(sessionEndTemplate(true, "Architect").length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for an abandoned session", () => {
    expect(sessionEndTemplate(false, "Unclassed").length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for every hunter class (cleared)", () => {
    const classes: HunterClass[] = [
      "Unclassed", "Architect", "Shadow Scout", "Assassin",
      "Berserker", "Sage", "Necromancer",
    ];
    for (const cls of classes) {
      const result = sessionEndTemplate(true, cls);
      expect(result.length, `class ${cls}`).toBeGreaterThan(0);
    }
  });
});
