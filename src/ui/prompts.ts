import { checkbox, confirm, input } from "@inquirer/prompts";
import pc from "picocolors";
import { LARGE_RESULT_THRESHOLD } from "../constants";
import type { CacheInfo, PackageManager, ScanResult } from "../types";
import { contractHome } from "../utils/paths";
import { formatSize } from "./format";

export function filterResults(results: ScanResult[], term: string): ScanResult[] {
  const needle = term.toLowerCase();
  return results.filter((r) => r.path.toLowerCase().includes(needle));
}

export async function selectNodeModules(
  results: ScanResult[],
  opts: { filter?: string } = {},
): Promise<ScanResult[]> {
  let working = results;

  if (opts.filter) {
    working = filterResults(results, opts.filter);
  } else if (results.length > LARGE_RESULT_THRESHOLD && process.stdout.isTTY) {
    const term = await input({
      message: `Filter ${results.length} results (substring, empty for all):`,
    });
    if (term.trim()) working = filterResults(results, term.trim());
  }

  if (working.length === 0) return [];

  const byPath = new Map(working.map((r) => [r.path, r]));
  const selected = await checkbox<string>({
    message: "Select node_modules to delete",
    choices: working.map((r) => ({
      name: `${contractHome(r.path)}  ${pc.dim(formatSize(r.size))}`,
      value: r.path,
      checked: true,
    })),
    pageSize: 15,
    loop: false,
  });

  return selected
    .map((p) => byPath.get(p))
    .filter((r): r is ScanResult => r !== undefined);
}

export async function selectCaches(caches: CacheInfo[]): Promise<CacheInfo[]> {
  const byManager = new Map(caches.map((c) => [c.manager, c]));
  const selected = await checkbox<PackageManager>({
    message: "Select caches to clear",
    choices: caches.map((c) => ({
      name: `${c.manager.padEnd(5)}  ${pc.dim(formatSize(c.size))}`,
      description: c.cachePath ? contractHome(c.cachePath) : undefined,
      value: c.manager,
      checked: true,
    })),
    loop: false,
  });

  return selected
    .map((m) => byManager.get(m))
    .filter((c): c is CacheInfo => c !== undefined);
}

export async function confirmAction(message: string, defaultYes = false): Promise<boolean> {
  return confirm({ message, default: defaultYes });
}
