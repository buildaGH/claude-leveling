/**
 * api.test.ts — callNarrationApi behaviour without a live API key.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { callNarrationApi } from "../api.js";

describe("callNarrationApi", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env["ANTHROPIC_API_KEY"];
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env["ANTHROPIC_API_KEY"];
    } else {
      process.env["ANTHROPIC_API_KEY"] = originalKey;
    }
  });

  it("returns null when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env["ANTHROPIC_API_KEY"];
    const result = await callNarrationApi("test prompt");
    expect(result).toBeNull();
  });

  it("returns null when ANTHROPIC_API_KEY is an empty string", async () => {
    process.env["ANTHROPIC_API_KEY"] = "";
    const result = await callNarrationApi("test prompt");
    expect(result).toBeNull();
  });
});
