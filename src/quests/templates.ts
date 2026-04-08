/**
 * templates.ts — Quest template pool, scaled by Hunter rank.
 *
 * Each template is a factory that produces a LocalQuest given a date string
 * and a questId. Goals scale with rank so early-game quests remain achievable
 * while late-game quests remain challenging.
 */

import { randomUUID } from "node:crypto";
import type { LocalQuest, QuestArchetype, QuestFrequency, Rank } from "../schema.js";

// ---------------------------------------------------------------------------
// Rank scaling helpers
// ---------------------------------------------------------------------------

/**
 * Rank index 0–6 used to scale goals.
 * E=0, D=1, C=2, B=3, A=4, S=5, NLP=6
 */
const RANK_SCALE: Record<Rank, number> = {
  E: 0, D: 1, C: 2, B: 3, A: 4, S: 5, "National-Level Programmer": 6,
};

function scale(base: number, rank: Rank, factor = 1.5): number {
  return Math.round(base * Math.pow(factor, RANK_SCALE[rank]));
}

// ---------------------------------------------------------------------------
// Quest expiry helpers
// ---------------------------------------------------------------------------

function endOfDay(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`;
}

function endOfWeek(weekStartStr: string): string {
  const d = new Date(`${weekStartStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return `${d.toISOString().slice(0, 10)}T23:59:59.999Z`;
}

// ---------------------------------------------------------------------------
// Template factory type
// ---------------------------------------------------------------------------

export interface QuestTemplate {
  archetype: QuestArchetype;
  frequency: QuestFrequency;
  build(rank: Rank, activeDate: string, questId?: string): LocalQuest;
}

// ---------------------------------------------------------------------------
// Daily quest templates
// ---------------------------------------------------------------------------

export const DAILY_TEMPLATES: QuestTemplate[] = [
  {
    archetype: "dungeon-raid",
    frequency: "daily",
    build(rank, activeDate, questId = randomUUID()) {
      const goal = scale(3, rank, 1.4);
      return {
        questId, archetype: "dungeon-raid", frequency: "daily",
        title: "Dungeon Raid",
        description: `Make ${goal} git commit${goal === 1 ? "" : "s"} today.`,
        xpReward: scale(150, rank, 1.5),
        status: "active", activeDate,
        expiresAt: endOfDay(activeDate),
        resolvedAt: null, progress: 0, goal, metadata: {},
      };
    },
  },
  {
    archetype: "hunt-the-weak",
    frequency: "daily",
    build(rank, activeDate, questId = randomUUID()) {
      const goal = scale(5, rank, 1.5);
      return {
        questId, archetype: "hunt-the-weak", frequency: "daily",
        title: "Hunt the Weak",
        description: `Pass ${goal} test run${goal === 1 ? "" : "s"} today.`,
        xpReward: scale(120, rank, 1.5),
        status: "active", activeDate,
        expiresAt: endOfDay(activeDate),
        resolvedAt: null, progress: 0, goal, metadata: {},
      };
    },
  },
  {
    archetype: "endurance-trial",
    frequency: "daily",
    build(rank, activeDate, questId = randomUUID()) {
      const goal = scale(30, rank, 1.3); // minutes
      return {
        questId, archetype: "endurance-trial", frequency: "daily",
        title: "Endurance Trial",
        description: `Code for ${goal} consecutive minutes today.`,
        xpReward: scale(100, rank, 1.4),
        status: "active", activeDate,
        expiresAt: endOfDay(activeDate),
        resolvedAt: null, progress: 0, goal, metadata: {},
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Weekly quest templates
// ---------------------------------------------------------------------------

export const WEEKLY_TEMPLATES: QuestTemplate[] = [
  {
    archetype: "gate-siege",
    frequency: "weekly",
    build(rank, activeDate, questId = randomUUID()) {
      return {
        questId, archetype: "gate-siege", frequency: "weekly",
        title: "Gate Siege",
        description: "Complete a full feature: commit, pass tests, and pass a build this week.",
        xpReward: scale(500, rank, 1.6),
        status: "active", activeDate,
        expiresAt: endOfWeek(activeDate),
        resolvedAt: null, progress: 0, goal: 3, // 3 distinct checkpoints
        metadata: { checkpoints: [] as string[] },
      };
    },
  },
  {
    archetype: "speed-clear",
    frequency: "weekly",
    build(rank, activeDate, questId = randomUUID()) {
      return {
        questId, archetype: "speed-clear", frequency: "weekly",
        title: "Speed Clear",
        description: "Fix a failing test within 30 minutes of it first failing.",
        xpReward: scale(300, rank, 1.5),
        status: "active", activeDate,
        expiresAt: endOfWeek(activeDate),
        resolvedAt: null, progress: 0, goal: 1,
        metadata: { timerStartedAt: null as string | null },
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Bonus gate template
// ---------------------------------------------------------------------------

const BONUS_TITLES = [
  "A Hidden Gate Appears",
  "The Ruler's Domain",
  "Shadow Exchange",
  "Cursed Quest",
];

export function buildBonusQuest(rank: Rank, activeDate: string): LocalQuest {
  const title = BONUS_TITLES[Math.floor(Math.random() * BONUS_TITLES.length)] ?? "A Hidden Gate Appears";
  const goal = scale(2, rank, 1.4);
  // Bonus gates expire in 2 hours
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  return {
    questId: randomUUID(),
    archetype: "bonus-gate",
    frequency: "daily",
    title,
    description: `Make ${goal} commit${goal === 1 ? "" : "s"} in the next 2 hours.`,
    xpReward: scale(250, rank, 1.6),
    status: "active", activeDate,
    expiresAt, resolvedAt: null,
    progress: 0, goal,
    metadata: {},
  };
}
