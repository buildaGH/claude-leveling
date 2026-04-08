import React from "react";
import { Box, Text } from "ink";
import type { SessionRecord } from "../../schema.js";

const BARS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

/** Group sessions by YYYY-MM-DD and sum xpEarned for the last N days. */
function dailyXp(sessions: SessionRecord[], days = 7): { date: string; xp: number }[] {
  const map = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }

  for (const s of sessions) {
    const date = s.startedAt.slice(0, 10);
    if (map.has(date)) {
      map.set(date, (map.get(date) ?? 0) + s.xpEarned);
    }
  }

  return Array.from(map.entries()).map(([date, xp]) => ({ date, xp }));
}

interface SparklineProps {
  sessions: SessionRecord[];
}

export function Sparkline({ sessions }: SparklineProps): React.ReactElement {
  const data = dailyXp(sessions, 7);
  const max  = Math.max(...data.map((d) => d.xp), 1);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Text bold color="gray">XP — Last 7 Days</Text>
      <Box gap={0} marginTop={0}>
        {data.map(({ date, xp }) => {
          const level = Math.round((xp / max) * (BARS.length - 1));
          const bar   = BARS[level] ?? "▁";
          const day   = date.slice(8); // DD
          const isToday = date === new Date().toISOString().slice(0, 10);
          return (
            <Box key={date} flexDirection="column" alignItems="center" width={5}>
              <Text color={isToday ? "yellow" : "cyan"}>{bar}{bar}{bar}</Text>
              <Text color={isToday ? "yellow" : "gray"}>{xp > 0 ? xp : ""}</Text>
              <Text color={isToday ? "yellow" : "gray"}>{day}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
