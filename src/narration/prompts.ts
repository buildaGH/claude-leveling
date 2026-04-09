/**
 * prompts.ts — User-message prompts for each narration event type.
 *
 * Each function returns a short instruction string that is sent as the
 * "user" message to the Claude API. The system prompt (in api.ts) sets
 * the voice; these prompts supply the event-specific context.
 */

import type { Rank, HunterClass, QuestArchetype } from "../schema.js";

export function rankUpPrompt(from: Rank, to: Rank, hunterClass: HunterClass, totalXp: number): string {
  return `Hunter advanced from Rank ${from} to Rank ${to}. Class: ${hunterClass}. Total XP: ${totalXp.toLocaleString()}.
Write a 1-2 sentence rank-up announcement. Be cold and formal. Acknowledge the advancement without warmth.`;
}

export function questCompletePrompt(title: string, archetype: QuestArchetype, rank: Rank): string {
  return `Hunter (Rank ${rank}) completed the quest "${title}" (archetype: ${archetype}).
Write 1-2 sentences confirming the quest completion. Be brief and formal.`;
}

export function titleUnlockPrompt(titleName: string, rank: Rank, hunterClass: HunterClass): string {
  return `Hunter (Rank ${rank}, Class ${hunterClass}) has unlocked the title 「${titleName}」.
Write 1-2 sentences acknowledging the title in the voice of the System. Be formal. Reference the title name.`;
}

export function shadowSummonPrompt(shadowName: string, signalCount: number): string {
  return `A new shadow named "${shadowName}" has been summoned. The Hunter has accumulated ${signalCount} signal events to earn this.
Write 1-2 sentences narrating the shadow's arrival. Be ominous.`;
}

export function sessionStartPrompt(projectName: string, rank: Rank, streak: number): string {
  const streakNote = streak >= 3 ? ` The Hunter is on a ${streak}-day streak.` : "";
  return `Hunter (Rank ${rank}) has entered the dungeon "${projectName}".${streakNote}
Write 1 sentence announcing the session start. Be foreboding.`;
}

export function sessionEndPrompt(
  minutes: number,
  rank: Rank,
  dungeonCleared: boolean,
  hunterClass: HunterClass,
): string {
  const outcome = dungeonCleared ? "cleared the dungeon" : "ended the session without clearing";
  return `Hunter (Rank ${rank}, Class ${hunterClass}) has ${outcome} after ${minutes} minutes.
Write 1-2 sentences closing out the session. Be final and measured.`;
}
