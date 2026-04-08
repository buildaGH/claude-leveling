import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import type { DungeonState, PlayerState } from "../schema.js";
import { PlayerCard } from "./components/PlayerCard.js";
import { XpBar } from "./components/XpBar.js";
import { StatBars } from "./components/StatBars.js";
import { QuestsPanel } from "./components/QuestsPanel.js";
import { Sparkline } from "./components/Sparkline.js";

interface DashboardProps {
  player: PlayerState;
  dungeon: DungeonState | null;
}

export function Dashboard({ player, dungeon }: DashboardProps): React.ReactElement {
  const { exit } = useApp();

  useEffect(() => {
    // Exit after a short delay so the terminal finishes rendering
    const t = setTimeout(() => exit(), 100);
    return () => clearTimeout(t);
  }, [exit]);

  const recentSessions = (dungeon?.sessions ?? [])
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 5);

  return (
    <Box flexDirection="column" gap={0}>
      <Text bold color="magenta">{"  ╔══ THE SYSTEM ══╗"}</Text>

      <PlayerCard player={player} />
      <XpBar player={player} />

      <Box gap={1}>
        <Box flexDirection="column" flexGrow={1}>
          <StatBars stats={player.stats} rank={player.rank} />
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <QuestsPanel quests={dungeon?.quests ?? []} />
          {dungeon && <Sparkline sessions={dungeon.sessions} />}
        </Box>
      </Box>

      {recentSessions.length > 0 && (
        <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold color="gray">Recent Sessions</Text>
          {recentSessions.map((s) => {
            const date = s.startedAt.slice(0, 10);
            const outcomeColor = s.outcome === "cleared" ? "green" : "gray";
            return (
              <Box key={s.sessionId} gap={2}>
                <Text color="gray">{date}</Text>
                <Text color="yellow">+{s.xpEarned} XP</Text>
                <Text color={outcomeColor}>{s.outcome}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
