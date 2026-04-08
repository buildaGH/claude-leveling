import { describe, expect, it } from "vitest";
import { compareVersions } from "../version.js";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("2.3.4", "2.3.4")).toBe(0);
  });

  it("compares major version", () => {
    expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
    expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
  });

  it("compares minor version when major is equal", () => {
    expect(compareVersions("1.2.0", "1.1.0")).toBe(1);
    expect(compareVersions("1.1.0", "1.2.0")).toBe(-1);
  });

  it("compares patch version when major and minor are equal", () => {
    expect(compareVersions("1.0.2", "1.0.1")).toBe(1);
    expect(compareVersions("1.0.1", "1.0.2")).toBe(-1);
  });

  it("major takes precedence over minor and patch", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
  });

  it("minor takes precedence over patch", () => {
    expect(compareVersions("1.2.0", "1.1.9")).toBe(1);
  });
});
