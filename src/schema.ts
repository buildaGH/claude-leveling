/**
 * schema.ts — Player and dungeon state types for claude-leveling.
 *
 * Two distinct persistence boundaries:
 *   ~/.claude-level/player.json  — global Hunter (rank, XP, stats, titles, class)
 *   .claude-level/dungeon.json   — per-project dungeon (sessions, local quests)
 *
 * Both carry a `schemaVersion` field so the migration utility can detect and
 * upgrade stale files without data loss.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** ISO-8601 datetime string — stored as string for JSON round-trip safety. */
export type ISODateString = string;

/** Semantic version string, e.g. "1.0.0". */
export type SemVer = string;

// ---------------------------------------------------------------------------
// Rank
// ---------------------------------------------------------------------------

export const RANKS = ["E", "D", "C", "B", "A", "S", "National-Level Programmer"] as const;
export type Rank = (typeof RANKS)[number];

// ---------------------------------------------------------------------------
// Hunter class
// ---------------------------------------------------------------------------

/**
 * Language/framework classes — unlocked passively from usage patterns.
 * They grant XP bonuses and flavour; they do NOT gate rank progression.
 */
export const HUNTER_CLASSES = [
  "Unclassed",
  "Architect",      // Heavy TypeScript / strongly-typed languages
  "Shadow Scout",   // Heavy bash / infra / DevOps patterns
  "Assassin",       // Heavy testing / TDD patterns
  "Berserker",      // High commit velocity, large diffs
  "Sage",           // Heavy documentation, long commit messages
  "Necromancer",    // Frequently resurrecting failing tests / reverts
] as const;
export type HunterClass = (typeof HUNTER_CLASSES)[number];

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface HunterStats {
  /** Code quality signals — lint passes, type coverage, clean builds. */
  intelligence: number;
  /** Commit frequency, files touched per session. */
  agility: number;
  /** Total active coding time (minutes). */
  endurance: number;
  /** Bugs caught — failed → passing tests, fix commits. */
  sense: number;
  /** Feature complexity — lines added, new files, PRs merged. */
  strength: number;
}

// ---------------------------------------------------------------------------
// Titles
// ---------------------------------------------------------------------------

export interface Title {
  id: string;
  name: string;
  unlockedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Global Hunter (persisted at ~/.claude-level/player.json)
// ---------------------------------------------------------------------------

export interface PlayerState {
  /** Schema version — bump when making breaking changes to this interface. */
  schemaVersion: SemVer;

  /** Stable UUID — used as the multiplayer/guild identity key. */
  hunterId: string;

  /** Display name chosen during `claude-level init`. */
  name: string;

  /** Current rank on the E → National-Level Programmer ladder. */
  rank: Rank;

  /** Total accumulated XP across all projects and sessions. */
  totalXp: number;

  /** XP earned since the start of the current rank. */
  rankXp: number;

  /**
   * XP required to advance to the next rank.
   * Stored here (not derived) so rank-up thresholds can evolve without
   * recomputing history.
   */
  xpToNextRank: number;

  /** Aggregate Hunter stats, accumulated globally. */
  stats: HunterStats;

  /** Active language/framework class — changes as usage patterns shift. */
  hunterClass: HunterClass;

  /** All unlocked titles, ordered by unlock time. */
  titles: Title[];

  /** The title currently displayed on the Hunter card. */
  activeTitle: string | null;

  /** ISO timestamp of when this player was created. */
  createdAt: ISODateString;

  /** ISO timestamp of the most recent XP event. */
  lastActiveAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Per-project dungeon state (persisted at .claude-level/dungeon.json)
// ---------------------------------------------------------------------------

export type SessionOutcome = "in-progress" | "cleared" | "abandoned";

export interface SessionRecord {
  /** Unique session ID (UUID). */
  sessionId: string;
  /** ISO timestamp when the session started (first PostToolUse of day). */
  startedAt: ISODateString;
  /** ISO timestamp when the session ended (Stop hook). */
  endedAt: ISODateString | null;
  outcome: SessionOutcome;
  /** XP earned during this session. */
  xpEarned: number;
  /** Stat deltas accumulated during this session. */
  statDeltas: Partial<HunterStats>;
  /** IDs of quests completed during this session. */
  questsCompleted: string[];
}

export type QuestStatus = "active" | "completed" | "failed" | "expired";
export type QuestArchetype =
  | "dungeon-raid"
  | "hunt-the-weak"
  | "speed-clear"
  | "endurance-trial"
  | "gate-siege"
  | "bonus-gate";

export interface LocalQuest {
  questId: string;
  archetype: QuestArchetype;
  title: string;
  description: string;
  xpReward: number;
  status: QuestStatus;
  /** ISO date (YYYY-MM-DD) this quest is active for. */
  activeDate: string;
  /** ISO timestamp when the quest expires. */
  expiresAt: ISODateString;
  /** ISO timestamp when completed or failed, null if still active. */
  resolvedAt: ISODateString | null;
  /** Numeric progress toward the quest goal (e.g. commits made). */
  progress: number;
  /** The target value to consider the quest complete. */
  goal: number;
}

export interface DungeonState {
  /** Schema version — must match PlayerState.schemaVersion on read. */
  schemaVersion: SemVer;

  /**
   * Human-readable project identifier, typically the directory name.
   * Not used as a key — the file location is the canonical identity.
   */
  projectName: string;

  /**
   * True once the dungeon has been "cleared" — i.e., at least one session
   * reached a `cleared` outcome.
   */
  dungeonCleared: boolean;

  /** ISO timestamp of the first ever session in this project. */
  firstEnteredAt: ISODateString;

  /** Ordered history of all sessions in this project. */
  sessions: SessionRecord[];

  /** Active and historical quests scoped to this project. */
  quests: LocalQuest[];

  /** Running total of XP earned inside this dungeon. */
  totalDungeonXp: number;
}
