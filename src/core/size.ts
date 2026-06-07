import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import type { LimitFunction } from "p-limit";
import { errorMessage } from "../utils/errors";

export interface DirSize {
  size: number;
  error?: string;
}

// Walk the tree ourselves, summing file sizes. Portable and correct, if not
// the fastest thing imaginable.
export async function getDirSize(
  root: string,
  limit: LimitFunction,
  signal?: AbortSignal,
): Promise<DirSize> {
  let total = 0;
  let firstError: string | undefined;

  async function walk(dir: string): Promise<void> {
    if (signal?.aborted) return;

    let entries;
    try {
      entries = await limit(() => readdir(dir, { withFileTypes: true }));
    } catch (err) {
      firstError ??= errorMessage(err);
      return;
    }

    const subdirs: Promise<void>[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        subdirs.push(walk(full));
      } else if (entry.isFile()) {
        try {
          const stats = await limit(() => lstat(full));
          total += stats.size;
        } catch (err) {
          firstError ??= errorMessage(err);
        }
      }
    }
    await Promise.all(subdirs);
  }

  await walk(root);
  return { size: total, error: firstError };
}
