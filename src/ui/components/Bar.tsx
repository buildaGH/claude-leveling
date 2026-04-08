import React from "react";
import { Text } from "ink";

interface BarProps {
  value: number;
  max: number;
  width?: number;
  color?: string;
}

export function Bar({ value, max, width = 20, color = "cyan" }: BarProps): React.ReactElement {
  const ratio  = max > 0 ? Math.min(1, value / max) : 0;
  const filled = Math.round(ratio * width);
  const empty  = width - filled;
  return (
    <Text>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text color="gray">{"░".repeat(empty)}</Text>
    </Text>
  );
}
