import { execFile } from "node:child_process";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { LimitFunction } from "p-limit";
import { errorMessage } from "../utils/errors";

const execFileAsync = promisify(execFile);

export interface DirSize {
  size: number;
  error?: string;
}

const IS_WINDOWS = process.platform === "win32";

// `du` reads sizes straight from the filesystem, far faster than statting every
// file from Node. Windows has no `du`, so there we walk the tree ourselves.
export async function getDirSize(
  root: string,
  limit: LimitFunction,
  signal?: AbortSignal,
): Promise<DirSize> {
  if (!IS_WINDOWS) {
    const viaDu = await tryDu(root, limit, signal);
    if (viaDu) return viaDu;
  }
  return jsDirSize(root, limit, signal);
}

async function tryDu(
  root: string,
  limit: LimitFunction,
  signal?: AbortSignal,
): Promise<DirSize | undefined> {
  let stdout: string;
  try {
    const result = await limit(() =>
      execFileAsync("du", ["-sk", root], {
        signal,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
      }),
    );
    stdout = result.stdout;
  } catch (err) {
    // `du` exits non-zero on unreadable entries but still prints the total.
    const partial = (err as { stdout?: string }).stdout;
    if (typeof partial !== "string" || partial.length === 0) return undefined;
    stdout = partial;
  }

  const kib = Number.parseInt(stdout.trim().split(/\s+/, 1)[0] ?? "", 10);
  if (!Number.isFinite(kib)) return undefined;
  return { size: kib * 1024 };
}

async function jsDirSize(
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
