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
import { renderRankUp, renderSessionEnd, renderStreakMilestone } from "./notify.js";
import { updateStreak } from "../quests/index.js";
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

      print(renderSessionEnd(endResult, result.updatedPlayer));
      if (streakResult.isNewDay && streakResult.streak >= 3) {
        print(renderStreakMilestone(streakResult.streak));
      }

      if (result.rankUp !== null) {
        print(renderRankUp(result.rankUp.from, result.rankUp.to, result.updatedPlayer));
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
