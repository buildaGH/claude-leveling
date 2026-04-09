#!/usr/bin/env node
/**
 * cli.ts — claude-level command-line interface.
 *
 * Commands:
 *   claude-level status   Open the main dashboard
 *   claude-level quests   Show active and recent quests
 *   claude-level log      Show session history
 */

import { Command } from "commander";
import { render } from "ink";
import React from "react";
import { openDungeonStorage, openPlayerStorage } from "./storage/index.js";
import { Dashboard } from "./ui/Dashboard.js";
import { QuestsView } from "./ui/QuestsView.js";
import { LogView } from "./ui/LogView.js";
import { AchievementsView } from "./ui/AchievementsView.js";
import { narrateSessionStart, narrateSessionEnd, narrateRankUp } from "./narration/index.js";
import { renderNarration } from "./hooks/notify.js";

const program = new Command();

program
  .name("claude-level")
  .description("Solo Leveling-style RPG gamification for Claude Code")
  .version("0.1.0");

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

program
  .command("status")
  .alias("s")
  .description("Open the Hunter dashboard")
  .action(async () => {
    const playerStorage  = openPlayerStorage();
    const dungeonStorage = openDungeonStorage();

    const player  = playerStorage.readOrCreate("Hunter");
    const dungeon = dungeonStorage.read();

    playerStorage.close();
    dungeonStorage.close();

    const { waitUntilExit } = render(
      React.createElement(Dashboard, { player, dungeon }),
    );
    await waitUntilExit();
  });

// ---------------------------------------------------------------------------
// quests
// ---------------------------------------------------------------------------

program
  .command("quests")
  .alias("q")
  .description("Show active and recent quests")
  .action(async () => {
    const dungeonStorage = openDungeonStorage();
    const dungeon = dungeonStorage.read();
    dungeonStorage.close();

    const quests = dungeon?.quests ?? [];

    const { waitUntilExit } = render(
      React.createElement(QuestsView, { quests }),
    );
    await waitUntilExit();
  });

// ---------------------------------------------------------------------------
// log
// ---------------------------------------------------------------------------

program
  .command("log")
  .alias("l")
  .description("Show session history")
  .action(async () => {
    const playerStorage  = openPlayerStorage();
    const dungeonStorage = openDungeonStorage();

    const player  = playerStorage.readOrCreate("Hunter");
    const dungeon = dungeonStorage.read();

    playerStorage.close();
    dungeonStorage.close();

    const { waitUntilExit } = render(
      React.createElement(LogView, {
        sessions:    dungeon?.sessions ?? [],
        hunterName:  player.name,
      }),
    );
    await waitUntilExit();
  });

// ---------------------------------------------------------------------------
// achievements
// ---------------------------------------------------------------------------

program
  .command("achievements")
  .alias("a")
  .description("Show titles, shadow army, and achievement counters")
  .action(async () => {
    const playerStorage = openPlayerStorage();
    const player = playerStorage.readOrCreate("Hunter");
    playerStorage.close();

    const { waitUntilExit } = render(
      React.createElement(AchievementsView, { player }),
    );
    await waitUntilExit();
  });

// ---------------------------------------------------------------------------
// narrate — "The System speaks" on demand
// ---------------------------------------------------------------------------

program
  .command("narrate")
  .alias("n")
  .description("Ask the System to narrate your current session (requires ANTHROPIC_API_KEY)")
  .action(async () => {
    const playerStorage  = openPlayerStorage();
    const dungeonStorage = openDungeonStorage();

    const player  = playerStorage.readOrCreate("Hunter");
    const dungeon = dungeonStorage.read();

    playerStorage.close();
    dungeonStorage.close();

    const projectName = process.cwd().split("/").pop() ?? "unknown";
    const recentSession = (dungeon?.sessions ?? [])
      .filter((s) => s.outcome === "in-progress" || s.outcome === "cleared")
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

    if (recentSession?.outcome === "in-progress") {
      const text = await narrateSessionStart(projectName, player.rank, player.streak);
      process.stdout.write(renderNarration(text) + "\n");
    } else if (recentSession?.outcome === "cleared") {
      const minutes = recentSession.endedAt
        ? Math.round((new Date(recentSession.endedAt).getTime() - new Date(recentSession.startedAt).getTime()) / 60_000)
        : 0;
      const text = await narrateSessionEnd(minutes, player.rank, true, player.hunterClass);
      process.stdout.write(renderNarration(text) + "\n");
    } else {
      // No recent session — narrate the rank as a general status message
      const text = await narrateRankUp("E", player.rank, player.hunterClass, player.totalXp);
      process.stdout.write(renderNarration(text) + "\n");
    }
  });

program.parse();
