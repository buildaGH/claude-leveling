/**
 * tracker.ts — Quest progress updates.
 *
 * After each accepted XP event, `updateQuestProgress` checks all active quests
 * and advances those whose archetype is triggered by the event. Completions are
 * detected here and the quest is marked accordingly.
 */

import type { DungeonStorage } from "../storage/index.js";
import type { LocalQuest, QuestArchetype } from "../schema.js";
import type { XPEvent, XPEventType } from "../events/types.js";

// ---------------------------------------------------------------------------
// Archetype → triggering events
// ---------------------------------------------------------------------------

const ARCHETYPE_TRIGGERS: Partial<Record<QuestArchetype, XPEventType[]>> = {
  "dungeon-raid":    ["git-commit"],
  "hunt-the-weak":  ["test-pass"],
  "gate-siege":     ["git-commit", "test-pass", "build-pass"],
  "speed-clear":    ["test-fail", "test-pass"],
  "endurance-trial": ["session-end"],
  "bonus-gate":     ["git-commit"],
};

// ---------------------------------------------------------------------------
// Per-archetype progress logic
// ---------------------------------------------------------------------------

function advanceDungeonRaid(quest: LocalQuest): LocalQuest {
  const next = quest.progress + 1;
  return { ...quest, progress: next };
}

function advanceHuntTheWeak(quest: LocalQuest): LocalQuest {
  return { ...quest, progress: quest.progress + 1 };
}

function advanceBonusGate(quest: LocalQuest): LocalQuest {
  return { ...quest, progress: quest.progress + 1 };
}

function advanceGateSiege(quest: LocalQuest, eventType: XPEventType): LocalQuest {
  const checkpoints = (quest.metadata["checkpoints"] as string[] | undefined) ?? [];
  const map: Partial<Record<XPEventType, string>> = {
    "git-commit":  "commit",
    "test-pass":   "test",
    "build-pass":  "build",
  };
  const cp = map[eventType];
  if (!cp || checkpoints.includes(cp)) return quest; // already counted
  const next = [...checkpoints, cp];
  return {
    ...quest,
    progress: next.length,
    metadata: { ...quest.metadata, checkpoints: next },
  };
}

const SPEED_CLEAR_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

function advanceSpeedClear(quest: LocalQuest, event: XPEvent): LocalQuest {
  if (event.type === "test-fail") {
    // Start or restart the timer
    return {
      ...quest,
      metadata: { ...quest.metadata, timerStartedAt: event.occurredAt },
    };
  }

  if (event.type === "test-pass") {
    const timerStartedAt = quest.metadata["timerStartedAt"];
    if (typeof timerStartedAt !== "string") return quest; // no timer running
    const elapsed = new Date(event.occurredAt).getTime() - new Date(timerStartedAt).getTime();
    if (elapsed <= SPEED_CLEAR_WINDOW_MS) {
      return { ...quest, progress: 1, metadata: { ...quest.metadata, timerStartedAt: null } };
    }
    // Expired window — reset timer
    return { ...quest, metadata: { ...quest.metadata, timerStartedAt: null } };
  }

  return quest;
}

function advanceEnduranceTrial(quest: LocalQuest, event: XPEvent): LocalQuest {
  const minutes = event.metadata["sessionMinutes"];
  if (typeof minutes !== "number") return quest;
  // Take the max — one long session is enough
  return { ...quest, progress: Math.max(quest.progress, minutes) };
}

// ---------------------------------------------------------------------------
// Complete/expire helpers
// ---------------------------------------------------------------------------

function resolve(quest: LocalQuest, status: "completed" | "expired", now: string): LocalQuest {
  return { ...quest, status, resolvedAt: now };
}

function isComplete(quest: LocalQuest): boolean {
  return quest.progress >= quest.goal;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface QuestUpdateResult {
  /** Quests that were completed by this event. */
  completed: LocalQuest[];
}

/**
 * Apply an XP event to all active quests and persist the updated state.
 * Returns a list of quests completed by this event (for notification output).
 */
export function updateQuestProgress(
  dungeonStorage: DungeonStorage,
  event: XPEvent,
): QuestUpdateResult {
  const dungeon = dungeonStorage.read();
  if (dungeon === null) return { completed: [] };

  const now = new Date().toISOString();
  const completed: LocalQuest[] = [];

  const updatedQuests = dungeon.quests.map((quest) => {
    if (quest.status !== "active") return quest;

    const triggers = ARCHETYPE_TRIGGERS[quest.archetype];
    if (!triggers?.includes(event.type)) return quest;

    let updated: LocalQuest;
    switch (quest.archetype) {
      case "dungeon-raid":    updated = advanceDungeonRaid(quest); break;
      case "hunt-the-weak":  updated = advanceHuntTheWeak(quest); break;
      case "bonus-gate":     updated = advanceBonusGate(quest); break;
      case "gate-siege":     updated = advanceGateSiege(quest, event.type); break;
      case "speed-clear":    updated = advanceSpeedClear(quest, event); break;
      case "endurance-trial":updated = advanceEnduranceTrial(quest, event); break;
      default:               updated = quest;
    }

    if (isComplete(updated) && updated.status === "active") {
      const done = resolve(updated, "completed", now);
      completed.push(done);
      return done;
    }

    return updated;
  });

  if (updatedQuests.some((q, i) => q !== dungeon.quests[i])) {
    dungeonStorage.write({ ...dungeon, quests: updatedQuests });
  }

  return { completed };
}
