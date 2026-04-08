import React from "react";
import { Box, Text } from "ink";
import type { LocalQuest } from "../../schema.js";
import { Bar } from "./Bar.js";

const ARCHETYPE_ICON: Record<string, string> = {
  "dungeon-raid":    "⚔",
  "hunt-the-weak":  "🎯",
  "speed-clear":    "⚡",
  "endurance-trial":"🛡",
  "gate-siege":     "🏰",
  "bonus-gate":     "✨",
};

const FREQ_COLOR: Record<string, string> = {
  daily:  "cyan",
  weekly: "yellow",
};

interface QuestsPanelProps {
  quests: LocalQuest[];
  /** Show only active quests when true (default), all when false */
  activeOnly?: boolean;
}

export function QuestsPanel({ quests, activeOnly = true }: QuestsPanelProps): React.ReactElement {
  const shown = activeOnly
    ? quests.filter((q) => q.status === "active")
    : quests;

  if (shown.length === 0) {
    return (
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">No active quests.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Text bold color="gray">Active Quests</Text>
      {shown.map((q) => {
        const icon     = ARCHETYPE_ICON[q.archetype] ?? "▸";
        const freqColor = FREQ_COLOR[q.frequency] ?? "white";
        const pct       = q.goal > 0 ? Math.round((q.progress / q.goal) * 100) : 0;
        const expiresIn = Math.max(
          0,
          Math.round((new Date(q.expiresAt).getTime() - Date.now()) / 3_600_000),
        );

        return (
          <Box key={q.questId} flexDirection="column" marginTop={1}>
            <Box gap={1}>
              <Text>{icon}</Text>
              <Text bold>{q.title}</Text>
              <Text color={freqColor}>[{q.frequency}]</Text>
              {expiresIn <= 2 && <Text color="red"> ⚠ {expiresIn}h left</Text>}
            </Box>
            <Box gap={1} marginLeft={2}>
              <Bar value={q.progress} max={q.goal} width={14} color="green" />
              <Text color="white">{q.progress}</Text>
              <Text color="gray">/ {q.goal}  ({pct}%)</Text>
            </Box>
            <Box marginLeft={2}><Text color="gray" dimColor>{q.description}</Text></Box>
          </Box>
        );
      })}
    </Box>
  );
}
