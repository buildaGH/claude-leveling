import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import type { SessionRecord } from "../schema.js";

const OUTCOME_COLOR: Record<string, string> = {
  cleared:     "green",
  abandoned:   "gray",
  "in-progress": "yellow",
};

interface LogViewProps {
  sessions: SessionRecord[];
  hunterName: string;
}

export function LogView({ sessions, hunterName }: LogViewProps): React.ReactElement {
  const { exit } = useApp();

  useEffect(() => {
    const t = setTimeout(() => exit(), 100);
    return () => clearTimeout(t);
  }, [exit]);

  const sorted = sessions
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const totalXp    = sorted.reduce((sum, s) => sum + s.xpEarned, 0);
  const cleared    = sorted.filter((s) => s.outcome === "cleared").length;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="magenta">{"  ╔══ SESSION LOG ══╗"}</Text>
      <Text color="gray">Hunter: <Text color="white">{hunterName}</Text>  ·  {sorted.length} sessions  ·  {totalXp.toLocaleString()} total XP  ·  {cleared} cleared</Text>

      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        {sorted.length === 0 && (
          <Text color="gray">No sessions yet. Start coding to begin your journey.</Text>
        )}
        {sorted.map((s) => {
          const date   = s.startedAt.slice(0, 10);
          const start  = new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const end    = s.endedAt
            ? new Date(s.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "ongoing";
          const mins   = s.endedAt
            ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60_000)
            : null;
          const color  = OUTCOME_COLOR[s.outcome] ?? "white";

          return (
            <Box key={s.sessionId} gap={2} marginTop={0}>
              <Text color="gray">{date}</Text>
              <Text color="gray">{start}–{end}</Text>
              {mins !== null && <Text color="gray">{mins}m</Text>}
              <Text color="yellow">+{s.xpEarned} XP</Text>
              <Text color={color}>{s.outcome}</Text>
              {s.questsCompleted.length > 0 && (
                <Text color="cyan">✓ {s.questsCompleted.length} quest{s.questsCompleted.length > 1 ? "s" : ""}</Text>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
