import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import type { LocalQuest } from "../schema.js";
import { Bar } from "./components/Bar.js";

const STATUS_COLOR: Record<string, string> = {
  active:    "green",
  completed: "cyan",
  expired:   "gray",
  failed:    "red",
};

const ARCHETYPE_ICON: Record<string, string> = {
  "dungeon-raid":    "⚔",
  "hunt-the-weak":  "🎯",
  "speed-clear":    "⚡",
  "endurance-trial":"🛡",
  "gate-siege":     "🏰",
  "bonus-gate":     "✨",
};

interface QuestsViewProps {
  quests: LocalQuest[];
}

export function QuestsView({ quests }: QuestsViewProps): React.ReactElement {
  const { exit } = useApp();

  useEffect(() => {
    const t = setTimeout(() => exit(), 100);
    return () => clearTimeout(t);
  }, [exit]);

  const active    = quests.filter((q) => q.status === "active");
  const resolved  = quests
    .filter((q) => q.status !== "active")
    .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""))
    .slice(0, 10);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="magenta">{"  ╔══ QUEST LOG ══╗"}</Text>

      {/* Active */}
      <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1}>
        <Text bold color="green">Active Quests ({active.length})</Text>
        {active.length === 0 && <Text color="gray">No active quests — check back tomorrow.</Text>}
        {active.map((q) => {
          const xpLeft = Math.max(0, q.goal - q.progress);
          return (
            <Box key={q.questId} flexDirection="column" marginTop={1}>
              <Box gap={1}>
                <Text>{ARCHETYPE_ICON[q.archetype] ?? "▸"}</Text>
                <Text bold>{q.title}</Text>
                <Text color="gray">[{q.frequency}]</Text>
                <Text color="yellow">+{q.xpReward} XP</Text>
              </Box>
              <Box gap={1} marginLeft={2}>
                <Bar value={q.progress} max={q.goal} width={18} color="green" />
                <Text>{q.progress}/{q.goal}</Text>
                {xpLeft > 0 && <Text color="gray">({xpLeft} to go)</Text>}
              </Box>
              <Box marginLeft={2}><Text color="gray">{q.description}</Text></Box>
              <Box marginLeft={2}><Text color="gray" dimColor>Expires: {new Date(q.expiresAt).toLocaleString()}</Text></Box>
            </Box>
          );
        })}
      </Box>

      {/* History */}
      {resolved.length > 0 && (
        <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold color="gray">Recent History</Text>
          {resolved.map((q) => (
            <Box key={q.questId} gap={2} marginTop={0}>
              <Text color={STATUS_COLOR[q.status] ?? "white"}>{q.status.padEnd(9)}</Text>
              <Text>{ARCHETYPE_ICON[q.archetype] ?? "▸"} {q.title}</Text>
              <Text color="gray">{q.resolvedAt?.slice(0, 10)}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
