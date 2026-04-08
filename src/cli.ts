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

program.parse();
