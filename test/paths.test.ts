import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canonical, contractHome, expandPath, isWithin } from "../src/utils/paths";

describe("expandPath", () => {
  it("expands ~ to the home directory", () => {
    expect(expandPath("~/projects")).toBe(path.join(os.homedir(), "projects"));
  });

  it("resolves relative paths to absolute", () => {
    expect(path.isAbsolute(expandPath("./foo"))).toBe(true);
  });
});

describe("contractHome", () => {
  it("replaces the home directory with ~", () => {
    const p = path.join(os.homedir(), "code", "app");
    expect(contractHome(p)).toBe(`~${path.sep}${path.join("code", "app")}`);
  });

  it("leaves unrelated paths untouched", () => {
    const p = path.join(path.sep, "tmp", "x");
    expect(contractHome(p)).toBe(p);
  });
});

describe("isWithin", () => {
  it("matches nested paths and the directory itself", () => {
    expect(isWithin(canonical("/a/b"), canonical("/a/b"))).toBe(true);
    expect(isWithin(canonical("/a/b"), canonical("/a/b/c"))).toBe(true);
  });

  it("rejects siblings and parents", () => {
    expect(isWithin(canonical("/a/b"), canonical("/a/bc"))).toBe(false);
    expect(isWithin(canonical("/a/b"), canonical("/a"))).toBe(false);
  });
});
