/**
 * narration/index.ts — Public API for the narration module.
 *
 * Each function tries the Claude API first (if ANTHROPIC_API_KEY is set)
 * and falls back to the corresponding static template. The caller always
 * gets a non-empty string — narration never fails silently.
 */

import { callNarrationApi } from "./api.js";
import {
  rankUpPrompt,
  questCompletePrompt,
  titleUnlockPrompt,
  shadowSummonPrompt,
  sessionStartPrompt,
  sessionEndPrompt,
} from "./prompts.js";
import {
  rankUpTemplate,
  questCompleteTemplate,
  titleUnlockTemplate,
  shadowSummonTemplate,
  sessionStartTemplate,
  sessionEndTemplate,
} from "./templates.js";
import type { Rank, HunterClass, QuestArchetype } from "../schema.js";

// ---------------------------------------------------------------------------
// Public narration functions
// ---------------------------------------------------------------------------

export async function narrateRankUp(
  from: Rank,
  to: Rank,
  hunterClass: HunterClass,
  totalXp: number,
): Promise<string> {
  const api = await callNarrationApi(rankUpPrompt(from, to, hunterClass, totalXp));
  return api ?? rankUpTemplate(to);
}

export async function narrateQuestComplete(
  title: string,
  archetype: QuestArchetype,
  rank: Rank,
): Promise<string> {
  const api = await callNarrationApi(questCompletePrompt(title, archetype, rank));
  return api ?? questCompleteTemplate(archetype);
}

export async function narrateTitleUnlock(
  titleName: string,
  rank: Rank,
  hunterClass: HunterClass,
): Promise<string> {
  const api = await callNarrationApi(titleUnlockPrompt(titleName, rank, hunterClass));
  return api ?? titleUnlockTemplate();
}

export async function narrateShadowSummon(
  shadowName: string,
  signalCount: number,
): Promise<string> {
  const api = await callNarrationApi(shadowSummonPrompt(shadowName, signalCount));
  return api ?? shadowSummonTemplate();
}

export async function narrateSessionStart(
  projectName: string,
  rank: Rank,
  streak: number,
): Promise<string> {
  const api = await callNarrationApi(sessionStartPrompt(projectName, rank, streak));
  return api ?? sessionStartTemplate();
}

export async function narrateSessionEnd(
  minutes: number,
  rank: Rank,
  dungeonCleared: boolean,
  hunterClass: HunterClass,
): Promise<string> {
  const api = await callNarrationApi(sessionEndPrompt(minutes, rank, dungeonCleared, hunterClass));
  return api ?? sessionEndTemplate(dungeonCleared, hunterClass);
}
