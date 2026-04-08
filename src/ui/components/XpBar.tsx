import React from "react";
import { Box, Text } from "ink";
import type { PlayerState } from "../../schema.js";
import { Bar } from "./Bar.js";

interface XpBarProps {
  player: PlayerState;
}

export function XpBar({ player }: XpBarProps): React.ReactElement {
  const pct = player.xpToNextRank > 0
    ? Math.round((player.rankXp / player.xpToNextRank) * 100)
    : 100;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Text bold color="gray">XP Progress</Text>
      <Box gap={2} marginTop={0}>
        <Bar value={player.rankXp} max={player.xpToNextRank} width={30} color="yellow" />
        <Text>
          <Text color="yellow">{player.rankXp.toLocaleString()}</Text>
          <Text color="gray"> / </Text>
          <Text>{player.xpToNextRank === Infinity ? "MAX" : player.xpToNextRank.toLocaleString()}</Text>
          <Text color="gray">  ({pct}%)</Text>
        </Text>
      </Box>
      <Text color="gray">Total XP: <Text color="white">{player.totalXp.toLocaleString()}</Text></Text>
    </Box>
  );
}
