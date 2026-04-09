/**
 * config.ts — User preferences at ~/.claude-level/config.json.
 *
 * Separate from PlayerState (game data) — this file holds preferences
 * that affect tooling behaviour rather than the progression system.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CONFIG_DIR  = join(homedir(), ".claude-level");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export interface Config {
  /** Display name for the Hunter — set once during init, editable after. */
  hunterName: string;
  /** Whether AI narration banners are shown (still requires ANTHROPIC_API_KEY). */
  narrationEnabled: boolean;
}

const DEFAULTS: Config = {
  hunterName:       "Hunter",
  narrationEnabled: true,
};

export function readConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return { ...DEFAULTS };
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<Config>;
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export function updateConfig(partial: Partial<Config>): Config {
  const current = readConfig();
  const updated = { ...current, ...partial };
  writeConfig(updated);
  return updated;
}
