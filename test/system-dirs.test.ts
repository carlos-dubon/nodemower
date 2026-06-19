import { describe, expect, it } from "vitest";
import { getSkipDirs } from "../src/utils/system-dirs";

describe("getSkipDirs", () => {
  it("skips editor data dirs so bundled extension node_modules survive", () => {
    const skip = getSkipDirs();
    for (const name of [
      ".vscode",
      ".vscode-insiders",
      ".vscode-oss",
      ".vscode-server",
      ".vscode-server-insiders",
      ".cursor",
      ".cursor-server",
      ".windsurf",
      ".windsurf-server",
    ]) {
      expect(skip.has(name)).toBe(true);
    }
  });

  it("skips node version managers so global CLIs survive", () => {
    const skip = getSkipDirs();
    for (const name of [
      ".nvm",
      ".fnm",
      ".volta",
      ".asdf",
      ".nodenv",
      ".nodebrew",
      ".npm-global",
    ]) {
      expect(skip.has(name)).toBe(true);
    }
  });

  it("skips XDG roots, matching the macOS/Windows app-data dirs", () => {
    const skip = getSkipDirs();
    for (const name of [".config", ".local", "library", "appdata"]) {
      expect(skip.has(name)).toBe(true);
    }
  });

  it("matches case-insensitively", () => {
    const skip = getSkipDirs();
    expect(skip.has(".vscode-server".toLowerCase())).toBe(true);
  });

  it("merges extra names, lowercased", () => {
    const skip = getSkipDirs(["MyVendor"]);
    expect(skip.has("myvendor")).toBe(true);
  });
});
