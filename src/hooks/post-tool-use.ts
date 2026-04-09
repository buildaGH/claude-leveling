#!/usr/bin/env node
/**
 * post-tool-use.ts — PostToolUse hook entry point.
 *
 * Called by Claude Code after every tool use. Reads the payload from stdin,
 * translates it into an XPEvent, runs it through the bus + engine, and
 * writes any user-visible output to stdout.
 *
 * Exit 0 always — hook errors must never interrupt the user's session.
 */

import { openDungeonStorage, openPlayerStorage } from "../storage/index.js";
import { EventBus } from "../events/index.js";
import { XPEngine } from "../xp/index.js";
import { parsePostToolUse } from "./parser.js";
import { getOrStartSession, recordSessionXp } from "./session.js";
import { isCapped } from "./caps.js";
import {
  renderBonusQuestSpawned,
  renderCapReached,
  renderClassChange,
  renderNarration,
  renderQuestComplete,
  renderQuestGenerated,
  renderRankUp,
  renderSessionStart,
  renderShadowSummoned,
  renderTitleUnlocked,
  renderXpLine,
} from "./notify.js";
import { maybeSpawnBonusQuest, refreshQuests, updateQuestProgress } from "../quests/index.js";
import { getNewTitles, applyNewTitles, updateAchievements } from "../titles/index.js";
import { getNewShadows, applyNewShadows } from "../shadows/index.js";
import {
  narrateQuestComplete,
  narrateRankUp,
  narrateSessionStart,
  narrateShadowSummon,
  narrateTitleUnlock,
} from "../narration/index.js";
import { print, readStdin } from "./io.js";
import type { PostToolUsePayload } from "./types.js";

async function main(): Promise<void> {
  const raw = JSON.parse(await readStdin()) as PostToolUsePayload;

  const projectRoot = process.cwd();
  const projectName = projectRoot.split("/").pop() ?? "unknown";

  const dungeonStorage = openDungeonStorage(projectRoot);
  const playerStorage  = openPlayerStorage();

  try {
    const event = parsePostToolUse(raw);
    if (event === null) return; // tool type carries no XP signal

    const { isNewSession, currentSession } = getOrStartSession(
      dungeonStorage,
      raw.session_id,
      projectName,
    );

    // Refresh quests (generate today's/this week's if not yet done, expire stale ones)
    const { generated } = refreshQuests(dungeonStorage, playerStorage);
    if (generated.length > 0) {
      print(renderQuestGenerated(generated.map((q) => q.title)));
    }

    if (isNewSession) {
      const player = playerStorage.readOrCreate(projectName);
      print(renderSessionStart(player.name, projectName));
      const sessionNarration = await narrateSessionStart(projectName, player.rank, player.streak);
      print(renderNarration(sessionNarration));

      // Random bonus quest on new session (10% chance)
      const bonus = maybeSpawnBonusQuest(dungeonStorage, player.rank);
      if (bonus !== null) print(renderBonusQuestSpawned(bonus.title));
    }

    // Session XP cap check (quality checkpoints bypass)
    const player = playerStorage.readOrCreate(projectName);
    if (isCapped(event.type, currentSession.xpEarned, player.rank)) {
      print(renderCapReached(player.rank));
      return;
    }

    // Rate-limit gate — bus updates rateLimitState; we call engine directly
    // (no handlers registered on bus — avoids double-invocation)
    const bus = new EventBus(dungeonStorage);
    const busResult = bus.process(event);
    if (!busResult.accepted) return; // rate-limited, no output needed

    const engine = new XPEngine(playerStorage);
    const result = engine.handle(event);

    recordSessionXp(dungeonStorage, raw.session_id, result.xpAwarded);

    // Update achievement counters based on this event
    const dungeon = dungeonStorage.readOrCreate(projectName);
    const updatedAchievements = updateAchievements(result.updatedPlayer, event, dungeon);
    let updatedPlayer = result.updatedPlayer;
    if (updatedAchievements !== result.updatedPlayer.achievements) {
      updatedPlayer = { ...updatedPlayer, achievements: updatedAchievements };
      playerStorage.write(updatedPlayer);
    }

    // Check for newly unlocked titles
    const newTitles = getNewTitles(updatedPlayer);
    if (newTitles.length > 0) {
      updatedPlayer = applyNewTitles(updatedPlayer, newTitles);
      playerStorage.write(updatedPlayer);
      for (const t of newTitles) {
        print(renderTitleUnlocked(t.name));
        const narration = await narrateTitleUnlock(t.name, updatedPlayer.rank, updatedPlayer.hunterClass);
        print(renderNarration(narration));
      }
    }

    // Check for newly summoned shadows
    const newShadows = getNewShadows(updatedPlayer);
    if (newShadows.length > 0) {
      updatedPlayer = applyNewShadows(updatedPlayer, newShadows);
      playerStorage.write(updatedPlayer);
      for (const s of newShadows) {
        const { SHADOW_DEFINITIONS } = await import("../shadows/definitions.js");
        const def = SHADOW_DEFINITIONS.find((d) => d.signalKey === s.signalKey);
        print(renderShadowSummoned(s.name, def?.flavour ?? "A shadow rises from the abyss."));
        const narration = await narrateShadowSummon(s.name, s.editCount);
        print(renderNarration(narration));
      }
    }

    // Update quest progress
    const { completed } = updateQuestProgress(dungeonStorage, event);
    for (const q of completed) {
      print(renderQuestComplete(q.title, q.xpReward));
      const questNarration = await narrateQuestComplete(q.title, q.archetype, updatedPlayer.rank);
      print(renderNarration(questNarration));
      // Award quest XP directly (bypass rate limits)
      const questPlayer = playerStorage.read();
      if (questPlayer !== null) {
        playerStorage.write({
          ...questPlayer,
          totalXp: questPlayer.totalXp + q.xpReward,
          rankXp: questPlayer.rankXp + q.xpReward,
        });
      }
    }

    // Regular XP line
    print(
      renderXpLine(
        result.xpAwarded,
        event.type,
        updatedPlayer.rankXp,
        updatedPlayer.xpToNextRank,
        updatedPlayer.rank,
      ),
    );

    // Rank-up banner
    if (result.rankUp !== null) {
      print(renderRankUp(result.rankUp.from, result.rankUp.to, updatedPlayer));
      const rankNarration = await narrateRankUp(
        result.rankUp.from,
        result.rankUp.to,
        updatedPlayer.hunterClass,
        updatedPlayer.totalXp,
      );
      print(renderNarration(rankNarration));
    }

    // Class change notification
    if (result.classChanged) {
      print(renderClassChange(updatedPlayer.hunterClass));
    }
  } finally {
    dungeonStorage.close();
    playerStorage.close();
  }
}

main().catch(() => {
  // Swallow all errors — hooks must never crash the user's session
  process.exit(0);
});
