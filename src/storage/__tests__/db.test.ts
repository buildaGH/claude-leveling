import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb, readState, writeState } from "../db.js";
import type Database from "better-sqlite3";

let dir: string;
let db: Database.Database;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cl-db-test-"));
  db = openDb(join(dir, "test.db"));
});

afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true });
});

describe("openDb", () => {
  it("creates the database file and state table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='state'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it("enables WAL journal mode", () => {
    const row = db.pragma("journal_mode", { simple: true });
    expect(row).toBe("wal");
  });

  it("creates parent directories if they do not exist", () => {
    const nested = openDb(join(dir, "a", "b", "c", "nested.db"));
    expect(nested.open).toBe(true);
    nested.close();
  });
});

describe("readState", () => {
  it("returns null when the key does not exist", () => {
    expect(readState(db, "missing")).toBeNull();
  });
});

describe("writeState / readState round-trip", () => {
  it("persists and retrieves a plain object", () => {
    writeState(db, "player", { name: "Sung Jin-Woo", xp: 100 });
    expect(readState(db, "player")).toEqual({ name: "Sung Jin-Woo", xp: 100 });
  });

  it("overwrites an existing key on subsequent writes", () => {
    writeState(db, "player", { xp: 100 });
    writeState(db, "player", { xp: 999 });
    expect(readState<{ xp: number }>(db, "player")?.xp).toBe(999);
  });

  it("stores independent values under different keys", () => {
    writeState(db, "alpha", { v: 1 });
    writeState(db, "beta", { v: 2 });
    expect(readState<{ v: number }>(db, "alpha")?.v).toBe(1);
    expect(readState<{ v: number }>(db, "beta")?.v).toBe(2);
  });

  it("round-trips nested objects and arrays", () => {
    const value = { stats: { strength: 10 }, titles: ["The Gamer", "Bug Slayer"] };
    writeState(db, "complex", value);
    expect(readState(db, "complex")).toEqual(value);
  });
});
