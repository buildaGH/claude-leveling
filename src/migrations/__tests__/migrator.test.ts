import { describe, expect, it } from "vitest";
import { needsMigration, runMigrations } from "../migrator.js";
import type { Migration } from "../types.js";

// ---------------------------------------------------------------------------
// Fixtures — a realistic two-step migration chain for tests
// ---------------------------------------------------------------------------

const migrations: Migration[] = [
  {
    fromVersion: "1.0.0",
    toVersion: "1.1.0",
    up: (state) => ({ ...state, schemaVersion: "1.1.0", newField: "added" }),
  },
  {
    fromVersion: "1.1.0",
    toVersion: "1.2.0",
    up: (state) => ({
      ...state,
      schemaVersion: "1.2.0",
      renamedField: state["newField"],
      newField: undefined,
    }),
  },
];

// ---------------------------------------------------------------------------
// needsMigration
// ---------------------------------------------------------------------------

describe("needsMigration", () => {
  it("returns false when stored version matches target", () => {
    expect(needsMigration({ schemaVersion: "1.0.0" }, "1.0.0")).toBe(false);
  });

  it("returns true when stored version is older than target", () => {
    expect(needsMigration({ schemaVersion: "1.0.0" }, "1.1.0")).toBe(true);
  });

  it("returns true when schemaVersion field is missing (treated as 0.0.0)", () => {
    expect(needsMigration({}, "1.0.0")).toBe(true);
  });

  it("returns true when stored version is newer than target", () => {
    expect(needsMigration({ schemaVersion: "2.0.0" }, "1.0.0")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runMigrations — no-op cases
// ---------------------------------------------------------------------------

describe("runMigrations — no-op", () => {
  it("returns the same state when already at target version", () => {
    const state = { schemaVersion: "1.2.0", data: 42 };
    const result = runMigrations(state, migrations, "1.2.0");
    expect(result).toBe(state); // same reference — no copy made
  });

  it("works with an empty migration registry if already at target", () => {
    const state = { schemaVersion: "1.0.0" };
    expect(() => runMigrations(state, [], "1.0.0")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// runMigrations — single step
// ---------------------------------------------------------------------------

describe("runMigrations — single step", () => {
  it("applies a single migration and updates schemaVersion", () => {
    const state = { schemaVersion: "1.0.0", name: "Hunter" };
    const result = runMigrations(state, migrations, "1.1.0");
    expect(result["schemaVersion"]).toBe("1.1.0");
    expect(result["newField"]).toBe("added");
    expect(result["name"]).toBe("Hunter"); // existing fields preserved
  });

  it("does not mutate the original state", () => {
    const state = { schemaVersion: "1.0.0" };
    runMigrations(state, migrations, "1.1.0");
    expect(state["schemaVersion"]).toBe("1.0.0");
  });
});

// ---------------------------------------------------------------------------
// runMigrations — chained steps
// ---------------------------------------------------------------------------

describe("runMigrations — chained steps", () => {
  it("applies all steps when migrating multiple versions", () => {
    const state = { schemaVersion: "1.0.0", name: "Hunter" };
    const result = runMigrations(state, migrations, "1.2.0");
    expect(result["schemaVersion"]).toBe("1.2.0");
    expect(result["renamedField"]).toBe("added");
    expect(result["name"]).toBe("Hunter");
  });

  it("applies steps in version order regardless of registration order", () => {
    const reversed = [...migrations].reverse();
    const state = { schemaVersion: "1.0.0" };
    const result = runMigrations(state, reversed, "1.2.0");
    expect(result["schemaVersion"]).toBe("1.2.0");
  });
});

// ---------------------------------------------------------------------------
// runMigrations — error cases
// ---------------------------------------------------------------------------

describe("runMigrations — errors", () => {
  it("throws when stored version is newer than target", () => {
    const state = { schemaVersion: "2.0.0" };
    expect(() => runMigrations(state, migrations, "1.0.0")).toThrow(/newer than target/);
  });

  it("throws when the migration chain has a gap", () => {
    const gapped: Migration[] = [
      {
        fromVersion: "1.0.0",
        toVersion: "1.1.0",
        up: (s) => ({ ...s, schemaVersion: "1.1.0" }),
      },
      // missing 1.1.0 → 1.2.0
    ];
    const state = { schemaVersion: "1.0.0" };
    expect(() => runMigrations(state, gapped, "1.2.0")).toThrow(/incomplete/);
  });

  it("treats a missing schemaVersion as 0.0.0 and migrates accordingly", () => {
    const legacyMigrations: Migration[] = [
      {
        fromVersion: "0.0.0",
        toVersion: "1.0.0",
        up: (s) => ({ ...s, schemaVersion: "1.0.0", migrated: true }),
      },
    ];
    const result = runMigrations({}, legacyMigrations, "1.0.0");
    expect(result["schemaVersion"]).toBe("1.0.0");
    expect(result["migrated"]).toBe(true);
  });
});
