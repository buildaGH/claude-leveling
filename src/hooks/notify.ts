/**
 * notify.ts — Solo Leveling flavour output for hook scripts.
 *
 * All functions return strings. Hook entry points write them to stdout.
 * Claude Code displays hook stdout inline in the conversation.
 *
 * Design: rank-up and session events get dramatic full-width banners.
 * Regular XP gains get a single terse line — low visual noise.
 */

import type { PlayerState, Rank } from "../schema.js";
import type { XPEventType } from "../events/types.js";
import type { RankUpEvent } from "../xp/engine.js";
import type { SessionEndResult } from "./session.js";

const WIDTH = 54;
const HR    = "─".repeat(WIDTH);

function box(lines: string[]): string {
  const top    = `╔${HR}╗`;
  const bottom = `╚${HR}╝`;
  const body   = lines.map((l) => `║  ${l.padEnd(WIDTH - 2)}║`).join("\n");
  return [top, body, bottom].join("\n");
}

// ---------------------------------------------------------------------------
// Regular XP line (shown after every accepted event)
// ---------------------------------------------------------------------------

const EVENT_LABELS: Partial<Record<XPEventType, string>> = {
  "file-edit":     "edit",
  "bash-command":  "bash",
  "git-commit":    "commit",
  "test-pass":     "tests ✓",
  "test-fail":     "tests ✗",
  "build-pass":    "build ✓",
  "build-fail":    "build ✗",
  "lint-pass":     "lint ✓",
  "session-end":   "session",
  "agent-spawn":   "summon",
};

export function renderXpLine(
  xpAwarded: number,
  eventType: XPEventType,
  rankXp: number,
  xpToNextRank: number,
  rank: Rank,
): string {
  const label   = EVENT_LABELS[eventType] ?? eventType;
  const bar     = `${rankXp}/${xpToNextRank}`;
  return `  ⚔  +${xpAwarded} XP  [${label}]  ${rank} ${bar}`;
}

// ---------------------------------------------------------------------------
// Session start — "A Gate has appeared"
// ---------------------------------------------------------------------------

export function renderSessionStart(hunterName: string, projectName: string): string {
  return box([
    "A Gate has appeared.",
    "",
    `Hunter  : ${hunterName}`,
    `Dungeon : ${projectName}`,
    "",
    "The System is watching.",
  ]);
}

// ---------------------------------------------------------------------------
// Rank-up — dramatic full banner
// ---------------------------------------------------------------------------

const RANK_TITLES: Record<Rank, string> = {
  E:                           "Beginner Hunter",
  D:                           "Apprentice Hunter",
  C:                           "Intermediate Hunter",
  B:                           "Advanced Hunter",
  A:                           "Elite Hunter",
  S:                           "S-Rank Hunter",
  "National-Level Programmer": "National-Level Programmer",
};

export function renderRankUp(from: Rank, to: Rank, player: PlayerState): string {
  return box([
    "[ RANK UP ]",
    "",
    `  ${from} ──────────────────► ${to}`,
    "",
    `Hunter   : ${player.name}`,
    `New Rank : ${to} — ${RANK_TITLES[to]}`,
    `Class    : ${player.hunterClass}`,
    "",
    '"I alone level up."',
  ]);
}

// ---------------------------------------------------------------------------
// Class change
// ---------------------------------------------------------------------------

export function renderClassChange(newClass: string): string {
  return `  ◈  Class awakened: ${newClass}`;
}

// ---------------------------------------------------------------------------
// Session end
// ---------------------------------------------------------------------------

export function renderSessionEnd(result: SessionEndResult, player: PlayerState): string {
  if (result.outcome === "abandoned") {
    return box([
      "Gate closed.",
      "",
      `Duration  : ${result.sessionMinutes}m`,
      "The dungeon remains unsealed.",
    ]);
  }

  const lines = [
    result.dungeonCleared ? "[ DUNGEON CLEARED — FIRST CLEAR ]" : "[ DUNGEON CLEARED ]",
    "",
    `Hunter    : ${player.name}`,
    `Duration  : ${result.sessionMinutes}m`,
    `Rank      : ${player.rank}`,
    `Total XP  : ${player.totalXp}`,
    "",
    "You have grown stronger.",
  ];
  return box(lines);
}

// ---------------------------------------------------------------------------
// Session XP cap reached
// ---------------------------------------------------------------------------

export function renderCapReached(rank: Rank): string {
  return `  ◈  Session limit reached for Rank ${rank}. Quality work still earns XP.`;
}

// ---------------------------------------------------------------------------
// Quest events
// ---------------------------------------------------------------------------

export function renderQuestComplete(questTitle: string, xpReward: number): string {
  return box([
    "[ QUEST COMPLETE ]",
    "",
    `  ${questTitle}`,
    `  +${xpReward} XP`,
    "",
    '"The System records your achievement."',
  ]);
}

export function renderQuestGenerated(titles: string[]): string {
  const lines = ["[ NEW QUESTS AVAILABLE ]", ""];
  for (const t of titles) lines.push(`  ▸ ${t}`);
  return box(lines);
}

export function renderBonusQuestSpawned(title: string): string {
  return box([
    "[ BONUS GATE DETECTED ]",
    "",
    `  ${title}`,
    "",
    "Complete it before the window closes.",
  ]);
}

export function renderStreakMilestone(streak: number): string {
  return `  ◈  ${streak}-day streak! Session XP bonus active.`;
}

// ---------------------------------------------------------------------------
// Titles & Shadow Army
// ---------------------------------------------------------------------------

export function renderTitleUnlocked(titleName: string): string {
  return box([
    "[ TITLE UNLOCKED ]",
    "",
    `  「${titleName}」`,
    "",
    '"The System has granted you a name."',
  ]);
}

export function renderShadowSummoned(shadowName: string, flavour: string): string {
  return box([
    "[ SHADOW SUMMONED ]",
    "",
    `  Shadow «${shadowName}» has risen.`,
    "",
    flavour,
  ]);
}

// ---------------------------------------------------------------------------
// Narration — "The System speaks"
// ---------------------------------------------------------------------------

export function renderNarration(text: string): string {
  // Wrap long lines to fit within WIDTH
  const maxLen = WIDTH - 4; // "  " prefix + "  " suffix
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length > maxLen && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) lines.push(current);

  return box(["[ THE SYSTEM SPEAKS ]", "", ...lines.map((l) => `  ${l}`)]);
}
