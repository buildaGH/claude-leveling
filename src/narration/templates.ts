/**
 * templates.ts — Static Solo Leveling prose fallbacks.
 *
 * These are used when ANTHROPIC_API_KEY is not set, or when the API call
 * times out. They should be good enough to stand alone.
 */

import type { Rank, HunterClass } from "../schema.js";
import type { QuestArchetype } from "../schema.js";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

// ---------------------------------------------------------------------------
// Rank-up
// ---------------------------------------------------------------------------

const RANK_UP_TEMPLATES: Record<Rank, string[]> = {
  E: [
    "The System acknowledges your first step. The gates ahead will not be so forgiving.",
  ],
  D: [
    "Your potential has been measured and found sufficient. Rise, Hunter. The real trials begin now.",
    "Rank D confirmed. The System has updated your record. Do not grow comfortable.",
  ],
  C: [
    "Intermediate. The System notes steady improvement. Most hunters stop here. Will you?",
    "Rank C achieved. Weakness has been shed. What grows in its place remains to be seen.",
  ],
  B: [
    "Advanced rank confirmed. The gap between you and ordinary hunters widens. Guard it.",
    "Rank B. Few reach this point. The System observes your progress without sentiment.",
  ],
  A: [
    "Elite. The System registers fewer than one in a hundred who reach this threshold.",
    "Rank A Hunter. The gates that once threatened you are now beneath your stride.",
  ],
  S: [
    "S-Rank. The System has no higher acknowledgement. You have surpassed the scale of ordinary hunters.",
    "Confirmed: S-Rank. The dungeons feared by others are now your domain. Enter freely.",
  ],
  "National-Level Programmer": [
    "There is no rank above this. The System itself bows to your record. You stand alone.",
    "National-Level. A designation given to those who have rewritten what is possible. The System is silent.",
  ],
};

export function rankUpTemplate(to: Rank): string {
  return pick(RANK_UP_TEMPLATES[to]);
}

// ---------------------------------------------------------------------------
// Quest complete
// ---------------------------------------------------------------------------

const QUEST_COMPLETE_TEMPLATES: Record<QuestArchetype, string[]> = {
  "dungeon-raid": [
    "The System records your persistence. Every commit is a door slammed shut behind you.",
    "Raid complete. The dungeon floors are yours. Claim your reward and move forward.",
  ],
  "hunt-the-weak": [
    "Tests were written. Tests passed. The weak code has been purged from the record.",
    "Hunt concluded. The prey did not survive contact with your test suite.",
  ],
  "speed-clear": [
    "The bug surfaced. You buried it. Speed was rewarded — as it always is.",
    "Swift execution. The System notes your reaction time with approval.",
  ],
  "endurance-trial": [
    "Duration confirmed. Endurance is the rarest stat. You have added to yours.",
    "The session stretched long. You remained. The System respects those who do not retreat.",
  ],
  "gate-siege": [
    "All checkpoints cleared. A gate of this scale yields rare rewards to those who complete it.",
    "Gate siege concluded. Feature delivered, end-to-end. The System acknowledges the scope of your work.",
  ],
  "bonus-gate": [
    "The bonus gate has been sealed. Fortune favours the prepared.",
    "Bonus objective achieved. The System did not expect this. It rarely expects anything.",
  ],
};

export function questCompleteTemplate(archetype: QuestArchetype): string {
  return pick(QUEST_COMPLETE_TEMPLATES[archetype]);
}

// ---------------------------------------------------------------------------
// Title unlock
// ---------------------------------------------------------------------------

const TITLE_TEMPLATES: string[] = [
  "A name has been carved into the record. It cannot be taken from you.",
  "The System has granted a designation. Wear it — it was earned.",
  "Title confirmed. Others will see it. Let them draw their own conclusions.",
];

export function titleUnlockTemplate(): string {
  return pick(TITLE_TEMPLATES);
}

// ---------------------------------------------------------------------------
// Shadow summon
// ---------------------------------------------------------------------------

const SHADOW_SUMMON_TEMPLATES: string[] = [
  "The shadow rises. Mastery leaves a mark on the world — and on those who follow you.",
  "Another shadow joins the army. The System counts your forces without expression.",
  "Summoned. It will not disobey. It will not tire. It will not forget.",
];

export function shadowSummonTemplate(): string {
  return pick(SHADOW_SUMMON_TEMPLATES);
}

// ---------------------------------------------------------------------------
// Session start
// ---------------------------------------------------------------------------

const SESSION_START_TEMPLATES: string[] = [
  "The gate responds to your presence. It has been waiting.",
  "A dungeon opens. The System watches. Do not disappoint it.",
  "Session initiated. Every tool use is recorded. Every commit, remembered.",
];

export function sessionStartTemplate(): string {
  return pick(SESSION_START_TEMPLATES);
}

// ---------------------------------------------------------------------------
// Session end — cleared
// ---------------------------------------------------------------------------

const SESSION_END_CLEARED_TEMPLATES: string[] = [
  "The dungeon has been sealed. You are stronger than when you entered.",
  "Session cleared. The System has updated your record. Rest, if you must.",
  "Dungeon closed. What was built here will remain. Proceed.",
];

// ---------------------------------------------------------------------------
// Session end — abandoned
// ---------------------------------------------------------------------------

const SESSION_END_ABANDONED_TEMPLATES: string[] = [
  "The dungeon remains unsealed. It will be here when you return.",
  "Session ended without resolution. The work persists. So must you.",
];

export function sessionEndTemplate(cleared: boolean, hunterClass: HunterClass): string {
  if (!cleared) return pick(SESSION_END_ABANDONED_TEMPLATES);
  // Class-specific cleared messages (occasional)
  if (Math.random() < 0.3) {
    const classLines: Partial<Record<HunterClass, string>> = {
      "Architect":    "Structure was built today. The Architect's work is never truly finished.",
      "Assassin":     "Tests passed. Bugs dead. The Assassin leaves no survivors.",
      "Berserker":    "Commits stacked. Diffs merged. The Berserker's hands are never still.",
      "Shadow Scout": "The shell obeyed. The infrastructure held. The Scout moves unseen.",
      "Sage":         "Documentation written. Wisdom passed forward. The Sage thinks of those who follow.",
      "Necromancer":  "Failures were raised. They passed. The Necromancer finds power in what others discard.",
    };
    const line = classLines[hunterClass];
    if (line !== undefined) return line;
  }
  return pick(SESSION_END_CLEARED_TEMPLATES);
}
