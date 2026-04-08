import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import type { PlayerState } from "../schema.js";

interface AchievementsViewProps {
  player: PlayerState;
}

export function AchievementsView({ player }: AchievementsViewProps): React.ReactElement {
  const { exit } = useApp();

  useEffect(() => {
    const t = setTimeout(() => exit(), 100);
    return () => clearTimeout(t);
  }, [exit]);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="magenta">{"  ╔══ THE SYSTEM — ACHIEVEMENTS ══╗"}</Text>

      {/* Titles */}
      <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1}>
        <Text bold color="yellow">Titles ({player.titles.length})</Text>
        {player.titles.length === 0 ? (
          <Text color="gray">  No titles unlocked yet.</Text>
        ) : (
          player.titles.map((t) => (
            <Box key={t.id} gap={2}>
              <Text color="yellow">
                {player.activeTitle === t.name ? "▶" : " "}
              </Text>
              <Text color="white" bold={player.activeTitle === t.name}>
                {`「${t.name}」`}
              </Text>
              <Text color="gray">{t.unlockedAt.slice(0, 10)}</Text>
            </Box>
          ))
        )}
      </Box>

      {/* Shadow Army */}
      <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">Shadow Army ({player.shadowArmy.length})</Text>
        {player.shadowArmy.length === 0 ? (
          <Text color="gray">  No shadows summoned yet.</Text>
        ) : (
          player.shadowArmy.map((s) => (
            <Box key={s.signalKey} gap={2}>
              <Text color="cyan">{"◈"}</Text>
              <Text color="white">{`«${s.name}»`}</Text>
              <Text color="gray">{`${s.editCount} uses`}</Text>
              <Text color="gray">{s.addedAt.slice(0, 10)}</Text>
            </Box>
          ))
        )}
      </Box>

      {/* Achievement counters */}
      <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1}>
        <Text bold color="green">Achievements</Text>
        <Box gap={2}>
          <Text color="gray">Files Created  :</Text>
          <Text color="white">{player.achievements.filesCreated}</Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">Bugs Fixed     :</Text>
          <Text color="white">{player.achievements.bugsFixed}</Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">Clean Sessions :</Text>
          <Text color="white">{player.achievements.cleanSessions}</Text>
        </Box>
        <Box gap={2}>
          <Text color="gray">Streak         :</Text>
          <Text color="white">{player.streak} days</Text>
          <Text color="gray">(best: {player.longestStreak})</Text>
        </Box>
      </Box>
    </Box>
  );
}
