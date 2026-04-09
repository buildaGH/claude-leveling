#!/usr/bin/env node
/**
 * cli.ts — claude-level command-line interface.
 *
 * Commands:
 *   claude-level init         First-time setup wizard
 *   claude-level status       Open the TUI dashboard
 *   claude-level quests       Show active quests
 *   claude-level log          Show session history
 *   claude-level achievements Show titles, shadows, and counters
 *   claude-level narrate      Ask the System to narrate your session
 */

import { createInterface } from "node:readline/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
import { readConfig, writeConfig } from "./config.js";
import { TITLE_DEFINITIONS } from "./titles/definitions.js";

const program = new Command();

program
  .name("claude-level")
  .description("Solo Leveling-style RPG gamification for Claude Code")
  .version("0.1.0");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return rl.question(question);
}

interface ClaudeSettings {
  hooks?: {
    PostToolUse?: unknown[];
    Stop?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function installHooks(projectRoot: string): { created: boolean; alreadyPresent: boolean } {
  const claudeDir      = join(projectRoot, ".claude");
  const settingsPath   = join(claudeDir, "settings.json");

  mkdirSync(claudeDir, { recursive: true });

  let settings: ClaudeSettings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8")) as ClaudeSettings;
    } catch {
      settings = {};
    }
  }

  // Check if hooks are already configured
  const hooks = settings.hooks ?? {};
  const hasPostToolUse = Array.isArray(hooks["PostToolUse"]) && hooks["PostToolUse"].length > 0;
  const hasStop        = Array.isArray(hooks["Stop"])        && hooks["Stop"].length > 0;
  if (hasPostToolUse && hasStop) return { created: false, alreadyPresent: true };

  settings.hooks = {
    ...hooks,
    PostToolUse: [
      {
        matcher: "Bash|Edit|Write|Agent",
        hooks: [{ type: "command", command: "claude-level-post-tool-use" }],
      },
    ],
    Stop: [
      {
        hooks: [{ type: "command", command: "claude-level-stop" }],
      },
    ],
  };

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  return { created: true, alreadyPresent: false };
}

const WIDTH = 54;
const HR    = "─".repeat(WIDTH);

function initBox(lines: string[]): string {
  const top    = `╔${HR}╗`;
  const bottom = `╚${HR}╝`;
  const body   = lines.map((l) => `║  ${l.padEnd(WIDTH - 2)}║`).join("\n");
  return [top, body, bottom].join("\n");
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

program
  .command("init")
  .alias("i")
  .description("First-time setup wizard — register your Hunter and configure hooks")
  .action(async () => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    console.log("\n" + initBox([
      "Welcome to Claude Leveling.",
      "",
      "The System is ready to initialise.",
      "Answer the prompts to begin your ascent.",
    ]) + "\n");

    // Hunter name
    const config      = readConfig();
    const defaultName = config.hunterName !== "Hunter" ? config.hunterName : "Hunter";
    const rawName     = await ask(rl, `  Hunter name [${defaultName}]: `);
    const hunterName  = rawName.trim() || defaultName;

    // Set up hooks
    const setupHooks = await ask(rl, "\n  Configure Claude Code hooks in this project? (Y/n): ");
    let hooksMessage = "";
    if (setupHooks.trim().toLowerCase() !== "n") {
      const result = installHooks(process.cwd());
      if (result.alreadyPresent) {
        hooksMessage = "Hooks already configured — no changes made.";
      } else {
        hooksMessage = "Hooks written to .claude/settings.json";
      }
    } else {
      hooksMessage = "Skipped. Run init again to configure hooks later.";
    }

    // API key status
    const hasApiKey = Boolean(process.env["ANTHROPIC_API_KEY"]);
    const apiKeyMessage = hasApiKey
      ? "ANTHROPIC_API_KEY detected — AI narration is active."
      : "ANTHROPIC_API_KEY not set. Add it to your shell config for AI narration.";

    rl.close();

    // Persist config and create player
    writeConfig({ hunterName, narrationEnabled: true });
    const playerStorage = openPlayerStorage();
    const existing = playerStorage.read();
    let player;
    if (existing !== null) {
      // Update name only — preserve all XP and progression
      player = { ...existing, name: hunterName };
      playerStorage.write(player);
    } else {
      player = playerStorage.readOrCreate(hunterName);
    }
    playerStorage.close();

    console.log("\n" + hooksMessage);
    console.log(apiKeyMessage + "\n");

    // Welcome box
    console.log(initBox([
      "[ HUNTER REGISTERED ]",
      "",
      `Name   : ${player.name}`,
      `Rank   : ${player.rank}`,
      `Class  : ${player.hunterClass}`,
      "",
      '"The System has recognised your potential."',
      "",
      "Begin your ascent.",
    ]));

    // Show unlockable titles as goals
    console.log("\n  Titles you can earn:\n");
    for (const def of TITLE_DEFINITIONS) {
      console.log(`  ▸ 「${def.name}」`);
    }
    console.log();
  });

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

    const projectName    = process.cwd().split("/").pop() ?? "unknown";
    const recentSession  = (dungeon?.sessions ?? [])
      .filter((s) => s.outcome === "in-progress" || s.outcome === "cleared")
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

    if (recentSession?.outcome === "in-progress") {
      const text = await narrateSessionStart(projectName, player.rank, player.streak);
      process.stdout.write(renderNarration(text) + "\n");
    } else if (recentSession?.outcome === "cleared") {
      const minutes = recentSession.endedAt
        ? Math.round(
            (new Date(recentSession.endedAt).getTime() - new Date(recentSession.startedAt).getTime()) / 60_000,
          )
        : 0;
      const text = await narrateSessionEnd(minutes, player.rank, true, player.hunterClass);
      process.stdout.write(renderNarration(text) + "\n");
    } else {
      const text = await narrateRankUp("E", player.rank, player.hunterClass, player.totalXp);
      process.stdout.write(renderNarration(text) + "\n");
    }
  });

program.parse();
