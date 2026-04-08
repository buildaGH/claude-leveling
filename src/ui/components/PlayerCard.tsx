import React from "react";
import { Box, Text } from "ink";
import type { PlayerState } from "../../schema.js";

const RANK_COLORS: Record<string, string> = {
  E: "white",
  D: "green",
  C: "cyan",
  B: "blue",
  A: "yellow",
  S: "magenta",
  "National-Level Programmer": "redBright",
};

interface PlayerCardProps {
  player: PlayerState;
}

export function PlayerCard({ player }: PlayerCardProps): React.ReactElement {
  const rankColor = RANK_COLORS[player.rank] ?? "white";
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Box gap={2}>
        <Text bold>Hunter</Text>
        <Text bold color="white">{player.name}</Text>
        <Text color="gray">·</Text>
        <Text>Rank </Text>
        <Text bold color={rankColor}>{player.rank}</Text>
        {player.rank === "National-Level Programmer" && (
          <Text color="redBright"> ★</Text>
        )}
      </Box>
      <Box gap={2} marginTop={0}>
        <Text color="gray">Class  </Text>
        <Text color="cyan">{player.hunterClass}</Text>
        {player.activeTitle && (
          <>
            <Text color="gray">·</Text>
            <Text color="yellow">「{player.activeTitle}」</Text>
          </>
        )}
      </Box>
      {player.streak > 0 && (
        <Box marginTop={0}>
          <Text color="orange">{"🔥"} </Text>
          <Text color="yellow">{player.streak}-day streak</Text>
          {player.streak >= 3 && <Text color="gray">  (XP bonus active)</Text>}
        </Box>
      )}
    </Box>
  );
}
