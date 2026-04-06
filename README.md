# Claude Leveling

> *"Arise."*

A Solo Leveling-style RPG gamification layer for [Claude Code](https://claude.ai/code). Your coding sessions become dungeon raids. Commits earn XP. Stats grow. You rank up. The System watches.

---

## What is this?

Claude Leveling hooks into Claude Code's event system to turn your everyday development work into an RPG progression loop — inspired by the manhwa *Solo Leveling*.

Every tool use, commit, test run, and bug fix is tracked. XP is awarded. Your Hunter grows stronger. Rank up from **E** all the way to **National-Level Programmer**.

---

## How it works

Claude Code fires hook events as you work — file edits, bash commands, test runs, and more. Claude Leveling listens to these events and:

1. Awards XP based on what you did and how well you did it
2. Updates your five core stats
3. Tracks active daily and weekly quests
4. Fires rank-up ceremonies when thresholds are hit
5. Narrates it all in Solo Leveling prose

Your **Hunter** is global — rank and XP follow you across every project. Each **project** is its own dungeon, with its own cleared status and session history.

---

## Hunter Stats

| Stat | What it measures |
|---|---|
| `Intelligence` | Code quality — lint passes, type coverage, clean builds |
| `Agility` | Commit frequency and files touched per session |
| `Endurance` | Total active coding time |
| `Sense` | Bugs caught — failed tests turned green, fix commits |
| `Strength` | Feature scale — lines added, new files, PRs merged |

---

## Rank Ladder

```
E → D → C → B → A → S → National-Level Programmer
```

Rank is global. Your class is separate.

Sustained use of specific languages and patterns unlocks a **class** — a passive specialisation that gives XP bonuses and flavour without gating progression.

| Class | Unlocks from |
|---|---|
| `Architect` | Heavy TypeScript / typed language usage |
| `Shadow Scout` | Heavy bash, infra, and scripting work |
| `Assassin` | Heavy test writing and coverage work |

---

## Quest System

Three daily quests reset at midnight. Weekly quests hit harder and reward more.

Example archetypes:

- **Dungeon Raid** — *"Commit 5 times today"*
- **Hunt the Weak** — *"Write 10 passing tests"*
- **Speed Clear** — *"Fix a bug within 30 minutes"*
- **Endurance Trial** — *"Work for 2 hours straight"*
- **Gate Siege** — *"Deliver a full feature end-to-end with Claude Code"*

Bonus quests trigger randomly during a session:

> *"A Gate has appeared. A hidden dungeon has been detected in this repository."*

---

## Titles

Achievements unlock equippable titles displayed on your Hunter card.

| Title | Condition |
|---|---|
| `"The Gamer"` | First rank up |
| `"Bug Slayer"` | Fix 50 bugs |
| `"Architect of Shadows"` | Create 100 files |
| `"Monarch"` | Reach S Rank |
| `"Solo Developer"` | Complete a feature with no failed attempts |

---

## Shadow Army

Technologies and patterns you've mastered are conscripted into your Shadow Army — detected from file types, packages used, and sustained activity.

> *"Shadow `TypeScript` has been added to your army."*

---

## CLI

```bash
claude-level status    # Open the TUI dashboard
claude-level quests    # View active quests
claude-level log       # XP history
claude-level init      # First-time setup wizard
```

---

## Installation

> Not yet published. Come back soon.

```bash
npm install -g claude-leveling
claude-level init
```

Then add the hooks to your `.claude/settings.json` — `claude-level init` handles this for you.

---

## Data & Storage

| Location | What's stored |
|---|---|
| `~/.claude-level/player.json` | Global Hunter — rank, XP, stats, titles, class, shadow army |
| `~/.claude-level/config.json` | User preferences |
| `.claude-level/dungeon.json` | Per-project dungeon state and session history |

---

## Roadmap

| Phase | Name | Status |
|---|---|---|
| 1 | **System Core** — schema, XP engine, stat engine, class system | 🔨 In progress |
| 2 | **Claude Code Hooks** — live event integration, quality checkpoints | Planned |
| 3 | **Quest System** — daily/weekly/bonus quests, streaks | Planned |
| 4 | **TUI Dashboard** — rank card, stat bars, XP sparkline, quest panel | Planned |
| 5 | **Titles & Shadow Army** — achievements and mastery tracking | Planned |
| 6 | **Claude API Integration** — AI-generated flavour text and narration | Planned |
| 7 | **Distribution** — `npm install -g`, setup wizard, full docs | Planned |
| 8 | **Guilds** *(stretch)* — team leaderboards scoped to GitHub orgs | Stretch |

---

## Inspiration

Based on the manhwa *Solo Leveling* by Chugong. This project is unofficial fan work — not affiliated with or endorsed by the original creators or publishers.

---

*The System has recognised your potential. Begin your ascent.*
