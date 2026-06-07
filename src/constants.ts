import os from "node:os";

export const NODE_MODULES = "node_modules";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const cpuCount = os.availableParallelism?.() ?? 4;

// Traversal is cheap `readdir` calls, so we can run many at once.
export const DEFAULT_SCAN_CONCURRENCY = clamp(cpuCount * 4, 8, 64);

// Sizing may spawn a `du` process per directory, so keep it lower.
export const DEFAULT_SIZE_CONCURRENCY = clamp(cpuCount * 2, 4, 16);

export const LARGE_RESULT_THRESHOLD = 25;

export const SUMMARY_PREVIEW_ROWS = 15;
