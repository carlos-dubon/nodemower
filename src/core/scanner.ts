import { readdir } from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import { NODE_MODULES } from "../constants";
import { getSkipDirs } from "../utils/system-dirs";
import type { ExcludeMatcher } from "./exclude";

export interface ScanOptions {
  root: string;
  exclude: ExcludeMatcher;
  concurrency: number;
  onFound?: (path: string) => void;
  signal?: AbortSignal;
}

export async function scan(options: ScanOptions): Promise<string[]> {
  const { root, exclude, concurrency, onFound, signal } = options;
  const limit = pLimit(concurrency);
  const skip = getSkipDirs();
  const found: string[] = [];

  async function walk(dir: string): Promise<void> {
    if (signal?.aborted) return;

    let entries;
    try {
      entries = await limit(() => readdir(dir, { withFileTypes: true }));
    } catch {
      return; // unreadable or gone
    }

    const descend: Promise<void>[] = [];
    for (const entry of entries) {
      // `isDirectory()` is false for symlinks, so symlinked dirs are skipped too.
      if (!entry.isDirectory()) continue;

      const name = entry.name;
      const full = path.join(dir, name);

      if (name === NODE_MODULES) {
        if (!exclude(full)) {
          found.push(full);
          onFound?.(full);
        }
        continue; // never descend into a node_modules
      }

      if (skip.has(name.toLowerCase())) continue;
      if (exclude(full)) continue;

      descend.push(walk(full));
    }

    await Promise.all(descend);
  }

  await walk(root);
  return found;
}
