#!/usr/bin/env node
/**
 * stop.ts — Stop hook entry point.
 *
 * Called by Claude Code when a conversation ends (clean or interrupted).
 * Awards session-end XP, finalises the session record, and prints the
 * session summary.
 *
 * Exit 0 always.
 */

import { openDungeonStorage, openPlayerStorage } from "../storage/index.js";
import { EventBus } from "../events/index.js";
import { XPEngine } from "../xp/index.js";
import { endSession } from "./session.js";
import {
  renderNarration,
  renderRankUp,
  renderSessionEnd,
  renderShadowSummoned,
  renderStreakMilestone,
  renderTitleUnlocked,
} from "./notify.js";
import { updateStreak } from "../quests/index.js";
import { checkCleanSession, getNewTitles, applyNewTitles } from "../titles/index.js";
import { getNewShadows, applyNewShadows } from "../shadows/index.js";
import { SHADOW_DEFINITIONS } from "../shadows/definitions.js";
import {
  narrateRankUp,
  narrateSessionEnd,
  narrateShadowSummon,
  narrateTitleUnlock,
} from "../narration/index.js";
import { print, readStdin } from "./io.js";
import type { StopPayload } from "./types.js";

async function main(): Promise<void> {
  const raw = JSON.parse(await readStdin()) as StopPayload;

  const projectRoot = process.cwd();
  const projectName = projectRoot.split("/").pop() ?? "unknown";

  const dungeonStorage = openDungeonStorage(projectRoot);
  const playerStorage  = openPlayerStorage();

  try {
    const endResult = endSession(dungeonStorage, raw.session_id, raw.stop_hook_active);

    // Update streak before awarding session-end XP (streak feeds the multiplier)
    const streakResult = updateStreak(playerStorage);

    // Award session-end XP regardless of outcome (even abandoned sessions earn Endurance)
    const sessionEndEvent = {
      type: "session-end" as const,
      occurredAt: new Date().toISOString(),
      metadata: {
        sessionMinutes: endResult.sessionMinutes,
        streak: streakResult.streak,
      },
    };

    const bus = new EventBus(dungeonStorage);
    const busResult = bus.process(sessionEndEvent);

    if (busResult.accepted) {
      const engine = new XPEngine(playerStorage);
      const result = engine.handle(sessionEndEvent);

      // Check clean session achievement
      const dungeon = dungeonStorage.readOrCreate(projectName);
      const session = dungeon.sessions.find((s) => s.sessionId === raw.session_id)
        ?? { startedAt: new Date().toISOString() };
      const updatedAchievements = checkCleanSession(result.updatedPlayer, session, dungeon);
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
          const def = SHADOW_DEFINITIONS.find((d) => d.signalKey === s.signalKey);
          print(renderShadowSummoned(s.name, def?.flavour ?? "A shadow rises from the abyss."));
          const narration = await narrateShadowSummon(s.name, s.editCount);
          print(renderNarration(narration));
        }
      }

      print(renderSessionEnd(endResult, updatedPlayer));
      const sessionNarration = await narrateSessionEnd(
        endResult.sessionMinutes,
        updatedPlayer.rank,
        endResult.outcome === "cleared",
        updatedPlayer.hunterClass,
      );
      print(renderNarration(sessionNarration));

      if (streakResult.isNewDay && streakResult.streak >= 3) {
        print(renderStreakMilestone(streakResult.streak));
      }

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
    } else {
      // Bus rejected (shouldn't happen for session-end, but be safe)
      const player = playerStorage.readOrCreate(projectName);
      print(renderSessionEnd(endResult, player));
    }
  } finally {
    dungeonStorage.close();
    playerStorage.close();
  }
}

main().catch(() => {
  process.exit(0);
});
