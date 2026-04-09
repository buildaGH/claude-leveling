# Claude Leveling

> *"Arise."*

A Solo Leveling-style RPG gamification layer for [Claude Code](https://claude.ai/code). Your coding sessions become dungeon raids. Commits earn XP. Stats grow. You rank up. The System watches.

---

## Installation

```bash
npm install -g claude-leveling
claude-level init
```

`init` will ask for your Hunter name and offer to configure Claude Code hooks in the current project. Run it once globally, then once per project you want to track.

> **Note:** The package requires Node ≥ 20.

---

## How it works

Claude Code fires hook events as you work — file edits, bash commands, test runs, and more. Claude Leveling listens and:

1. Awards XP based on what you did and how well you did it
2. Updates your five core stats
3. Tracks active daily and weekly quests
4. Fires rank-up and class-change ceremonies
5. Summons shadows and unlocks titles as you hit milestones
6. Narrates it all in Solo Leveling prose (optionally via the Claude API)

Your **Hunter** is global — rank, XP, and shadow army follow you across every project. Each **project** is its own dungeon with its own cleared status, session history, and quest board.

---

## Quick start

### 1. Install and initialise

```bash
npm install -g claude-leveling
claude-level init
```

### 2. Per-project setup

Run `init` inside any project you want tracked:

```bash
cd my-project
claude-level init
```

This writes the hook entries to `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash|Edit|Write|Agent",
        "hooks": [{ "type": "command", "command": "claude-level-post-tool-use" }]
      }
    ],
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "claude-level-stop" }]
      }
    ]
  }
}
```

### 3. Optional: AI narration

Set `ANTHROPIC_API_KEY` in your shell config to enable the Claude API narration layer. The system works fully without it — static Solo Leveling prose is always the fallback.

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

---

## CLI

| Command | Alias | Description |
|---|---|---|
| `claude-level init` | `i` | First-time setup wizard |
| `claude-level status` | `s` | Open the TUI dashboard |
| `claude-level quests` | `q` | Show active and completed quests |
| `claude-level log` | `l` | Session history |
| `claude-level achievements` | `a` | Titles, shadow army, achievement counters |
| `claude-level narrate` | `n` | Ask the System to narrate your session |

---

## Hunter Stats

| Stat | What it measures |
|---|---|
| `Intelligence` | Code quality — lint passes, type coverage, clean builds |
| `Agility` | Commit frequency and files touched per session |
| `Endurance` | Total active coding time |
| `Sense` | Bugs caught — failed tests turned green, fix commits |
| `Strength` | Feature scale — lines added, new files created |

---

## Rank Ladder

```
E → D → C → B → A → S → National-Level Programmer
```

Rank is global and persists across every project. XP from every session accumulates toward the next threshold.

---

## Hunter Classes

Sustained use of specific languages and patterns unlocks a **class** — a passive specialisation that grants XP bonuses and flavour without gating rank progression.

| Class | Unlocks from |
|---|---|
| `Architect` | Heavy TypeScript / typed language usage |
| `Shadow Scout` | Heavy bash, infra, and scripting work |
| `Assassin` | Heavy test writing and TDD patterns |
| `Berserker` | High commit velocity and large diffs |
| `Sage` | Long commit messages and heavy documentation |
| `Necromancer` | Frequently rescuing failing tests and reverts |
| `Unclassed` | Not enough signal yet |

Classes reclassify dynamically as your usage patterns shift.

---

## Quest System

Three daily quests reset at midnight. Weekly quests hit harder and reward more. Quests are generated per-project and tracked in the dungeon state.

### Archetypes

| Archetype | Example |
|---|---|
| **Dungeon Raid** | *"Commit 5 times today"* |
| **Hunt the Weak** | *"Pass 10 tests this session"* |
| **Speed Clear** | *"Fix a bug within 30 minutes"* |
| **Endurance Trial** | *"Work for 2 hours straight"* |
| **Gate Siege** | *"Deliver a full feature end-to-end"* |
| **Bonus Gate** | Spawns randomly at session start (10% chance) |

### Streaks

Consecutive active days compound your session-end XP:

| Streak | Multiplier |
|---|---|
| 3 days | ×1.1 |
| 7 days | ×1.2 |
| 14 days | ×1.3 |

---

## Titles

Achievements unlock equippable titles shown on your Hunter card.

| Title | Condition |
|---|---|
| `「First Blood」` | Earn any XP |
| `「The Gamer」` | First rank up |
| `「On a Roll」` | 7-day streak |
| `「Solo Developer」` | Complete a clean session (commit + tests passing, zero failures) |
| `「Bug Slayer」` | Fix 50 bugs |
| `「Architect of Shadows」` | Create 100 files |
| `「Shadow Sovereign」` | Summon 5 shadows |
| `「Monarch」` | Reach S Rank |

---

## Shadow Army

Technologies and patterns you've mastered are conscripted into your Shadow Army. Each shadow is summoned the first time a class signal crosses its threshold.

| Shadow | Signal | Threshold |
|---|---|---|
| TypeScript | `.ts` / `.tsx` edits | 50 |
| JavaScript | `.js` / `.jsx` edits | 50 |
| Python | `.py` edits | 50 |
| Rust | `.rs` edits | 30 |
| Go | `.go` edits | 30 |
| Shell | Bash commands | 100 |
| The Tester | Test passes | 30 |
| The Committer | Git commits | 50 |
| The Summoner | Agent spawns | 10 |

---

## XP Anti-farming

The system rates-limits rapid events to prevent farming. Each event type has a cooldown window. Sessions also have per-rank XP caps — but quality checkpoints (commits, test passes, builds, lint passes) always bypass the cap.

---

## AI Narration

When `ANTHROPIC_API_KEY` is set, the System narrates key moments using the Claude API (`claude-haiku-4-5-20251001` — fast and cheap). If the API is unavailable or times out (5s limit), static templates are used transparently.

Narrated events:
- Session start
- Quest complete
- Title unlock
- Shadow summon
- Rank-up
- Session end

You can also invoke narration on demand:

```bash
claude-level narrate
```

---

## Data & Storage

| Location | Contents |
|---|---|
| `~/.claude-level/player.db` | Global Hunter — rank, XP, stats, titles, class, shadow army |
| `~/.claude-level/config.json` | User preferences (hunter name, narration toggle) |
| `.claude-level/dungeon.db` | Per-project dungeon — sessions, quests, rate-limit state |

All storage uses SQLite via `better-sqlite3` in WAL mode for safe concurrent writes from hook processes.

Schema migrations run automatically on read — old data is never lost.

---

## Roadmap

| Phase | Name | Status |
|---|---|---|
| 1 | **System Core** — schema, XP engine, stats, class system | ✅ Done |
| 2 | **Claude Code Hooks** — live event integration, quality checkpoints | ✅ Done |
| 3 | **Quest System** — daily/weekly/bonus quests, streaks | ✅ Done |
| 4 | **TUI Dashboard** — rank card, stat bars, XP sparkline, quest panel | ✅ Done |
| 5 | **Titles & Shadow Army** — achievements and mastery tracking | ✅ Done |
| 6 | **Claude API Integration** — AI-generated flavour text and narration | ✅ Done |
| 7 | **Distribution** — `npm install -g`, setup wizard, full docs | ✅ Done |
| 8 | **Guilds** *(stretch)* — team leaderboards scoped to GitHub orgs | Planned |

---

## Inspiration

Based on the manhwa *Solo Leveling* by Chugong. This project is unofficial fan work — not affiliated with or endorsed by the original creators or publishers.

---

*The System has recognised your potential. Begin your ascent.*
