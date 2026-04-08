/**
 * definitions.ts — Shadow soldier unlock thresholds.
 *
 * Each definition maps a classSignal key to a display name and the
 * minimum signal count required for the shadow to be summoned.
 */

export interface ShadowDefinition {
  /** The classSignal key to check. */
  signalKey: string;
  /** Display name shown in the Shadow Army roster. */
  name: string;
  /** Flavour description for the summon notification. */
  flavour: string;
  /** Signal count required to summon this shadow. */
  threshold: number;
}

export const SHADOW_DEFINITIONS: ShadowDefinition[] = [
  {
    signalKey: "tsEdits",
    name:      "TypeScript",
    flavour:   "A shadow forged from strict types and compiled certainty.",
    threshold: 50,
  },
  {
    signalKey: "jsEdits",
    name:      "JavaScript",
    flavour:   "A shadow born of dynamic chaos, tamed by your will.",
    threshold: 50,
  },
  {
    signalKey: "pyEdits",
    name:      "Python",
    flavour:   "A shadow of elegant simplicity — deceptively powerful.",
    threshold: 50,
  },
  {
    signalKey: "rustEdits",
    name:      "Rust",
    flavour:   "A shadow of iron discipline. It never forgets ownership.",
    threshold: 30,
  },
  {
    signalKey: "goEdits",
    name:      "Go",
    flavour:   "A shadow of quiet efficiency. No excess. No waste.",
    threshold: 30,
  },
  {
    signalKey: "bashRuns",
    name:      "Shell",
    flavour:   "A shadow that haunts the terminal, bending the OS to your command.",
    threshold: 100,
  },
  {
    signalKey: "testPasses",
    name:      "The Tester",
    flavour:   "A shadow born from green suites. It guards quality with its life.",
    threshold: 30,
  },
  {
    signalKey: "commits",
    name:      "The Committer",
    flavour:   "A shadow of relentless progress. It never leaves work uncommitted.",
    threshold: 50,
  },
  {
    signalKey: "agentSpawns",
    name:      "The Summoner",
    flavour:   "A shadow that calls others. Power multiplied.",
    threshold: 10,
  },
];
