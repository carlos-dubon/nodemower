import { describe, expect, it } from "vitest";
import { formatSize, pluralize, renderColumns, truncateStart } from "../src/ui/format";

describe("formatSize", () => {
  it("formats bytes as human-readable decimal units", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(1500)).toBe("1.5 kB");
  });

  it("renders a dash for unknown or negative sizes", () => {
    expect(formatSize(undefined)).toBe("—");
    expect(formatSize(-1)).toBe("—");
  });
});

describe("truncateStart", () => {
  it("keeps strings that fit", () => {
    expect(truncateStart("abc", 10)).toBe("abc");
  });

  it("truncates from the start with an ellipsis, preserving total width", () => {
    const out = truncateStart("abcdefghij", 5);
    expect(out).toBe("…ghij");
    expect(out).toHaveLength(5);
  });
});

describe("pluralize", () => {
  it("handles singular, plural, and custom plurals", () => {
    expect(pluralize(1, "cache")).toBe("cache");
    expect(pluralize(2, "cache")).toBe("caches");
    expect(pluralize(2, "directory", "directories")).toBe("directories");
  });
});

describe("renderColumns", () => {
  it("right-aligns values and pads to a consistent width", () => {
    const lines = renderColumns(
      [
        { left: "a", right: "1 GB" },
        { left: "bb", right: "10 MB" },
      ],
      { maxWidth: 40, dimRight: false },
    );
    expect(lines).toHaveLength(2);
    // Every rendered line should share the same visible length.
    expect(lines[0]).toHaveLength(lines[1]!.length);
  });
});
