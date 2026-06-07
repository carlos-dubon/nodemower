import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createExcludeMatcher } from "../src/core/exclude";

describe("createExcludeMatcher", () => {
  it("never matches when there are no patterns", () => {
    const matcher = createExcludeMatcher([]);
    expect(matcher(path.join(os.homedir(), "anything"))).toBe(false);
  });

  it("matches the excluded directory and everything beneath it", () => {
    const base = path.join(os.homedir(), "projects", "keep");
    const matcher = createExcludeMatcher([base]);
    expect(matcher(base)).toBe(true);
    expect(matcher(path.join(base, "node_modules"))).toBe(true);
    expect(matcher(path.join(base, "packages", "a", "node_modules"))).toBe(true);
  });

  it("does not match sibling directories with a shared prefix", () => {
    const base = path.join(os.homedir(), "projects", "keep");
    const matcher = createExcludeMatcher([base]);
    const sibling = path.join(os.homedir(), "projects", "keep-too", "node_modules");
    expect(matcher(sibling)).toBe(false);
  });

  it("expands ~ and ignores blank patterns", () => {
    const matcher = createExcludeMatcher(["", "  ", "~/projects/keep"]);
    expect(matcher(path.join(os.homedir(), "projects", "keep", "node_modules"))).toBe(true);
  });
});
