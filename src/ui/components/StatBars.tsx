import React from "react";
import { Box, Text } from "ink";
import type { HunterStats, Rank } from "../../schema.js";
import { STAT_CURVES } from "../../xp/ranks.js";
import { Bar } from "./Bar.js";

const STAT_LABELS: Record<keyof HunterStats, string> = {
  intelligence: "Intelligence",
  agility:      "Agility     ",
  endurance:    "Endurance   ",
  sense:        "Sense       ",
  strength:     "Strength    ",
};

const STAT_COLORS: Record<keyof HunterStats, string> = {
  intelligence: "cyan",
  agility:      "green",
  endurance:    "yellow",
  sense:        "magenta",
  strength:     "red",
};

interface StatBarsProps {
  stats: HunterStats;
  rank: Rank;
}

export function StatBars({ stats, rank }: StatBarsProps): React.ReactElement {
  const curve = STAT_CURVES[rank];
  const keys = Object.keys(stats) as (keyof HunterStats)[];

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Text bold color="gray">Stats</Text>
      {keys.map((key) => (
        <Box key={key} gap={1} marginTop={0}>
          <Text color="gray">{STAT_LABELS[key]}</Text>
          <Bar value={stats[key]} max={curve[key]} width={16} color={STAT_COLORS[key]} />
          <Text color="white">{stats[key]}</Text>
          <Text color="gray">/ ~{curve[key]}</Text>
        </Box>
      ))}
    </Box>
  );
}
