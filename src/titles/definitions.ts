/**
 * definitions.ts — Title definitions with unlock conditions.
 *
 * Each definition is pure: the condition receives only PlayerState and
 * returns true when the title should be awarded. The checker calls these
 * after every XP event and after session end.
 */

import type { PlayerState } from "../schema.js";

export interface TitleDefinition {
  id: string;
  name: string;
  /** One-line description shown in the Achievements screen. */
  flavour: string;
  /** Returns true when this title should be unlocked. */
  condition: (player: PlayerState) => boolean;
}

export const TITLE_DEFINITIONS: TitleDefinition[] = [
  {
    id:      "the-gamer",
    name:    "The Gamer",
    flavour: "Achieved your first rank-up. The System has acknowledged you.",
    condition: (p) => p.rank !== "E",
  },
  {
    id:      "bug-slayer",
    name:    "Bug Slayer",
    flavour: "Fixed 50 bugs. They never stood a chance.",
    condition: (p) => p.achievements.bugsFixed >= 50,
  },
  {
    id:      "architect-of-shadows",
    name:    "Architect of Shadows",
    flavour: "Created 100 files. You build entire worlds from nothing.",
    condition: (p) => p.achievements.filesCreated >= 100,
  },
  {
    id:      "monarch",
    name:    "Monarch",
    flavour: "Reached S Rank. You stand above all others.",
    condition: (p) => p.rank === "S" || p.rank === "National-Level Programmer",
  },
  {
    id:      "solo-developer",
    name:    "Solo Developer",
    flavour: "Completed a feature end-to-end with no failed attempts. Flawless.",
    condition: (p) => p.achievements.cleanSessions >= 1,
  },
  // Bonus titles for early milestones
  {
    id:      "first-blood",
    name:    "First Blood",
    flavour: "Earned your first XP. The hunt has begun.",
    condition: (p) => p.totalXp >= 1,
  },
  {
    id:      "on-a-roll",
    name:    "On a Roll",
    flavour: "Maintained a 7-day coding streak.",
    condition: (p) => p.longestStreak >= 7,
  },
  {
    id:      "shadow-sovereign",
    name:    "Shadow Sovereign",
    flavour: "Assembled a Shadow Army of 5 or more.",
    condition: (p) => p.shadowArmy.length >= 5,
  },
];
