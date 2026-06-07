import os from "node:os";
import pLimit from "p-limit";
import { DEFAULT_SIZE_CONCURRENCY, SUMMARY_PREVIEW_ROWS } from "../constants";
import { analyze } from "../core/analyze";
import { measureCache } from "../core/cache";
import { loadConfig } from "../core/config";
import { createExcludeMatcher, type ExcludeMatcher } from "../core/exclude";
import type { CacheInfo, ScanResult } from "../types";
import { formatSize, renderColumns } from "../ui/format";
import { createSpinner, log } from "../ui/logger";
import { contractHome, expandPath } from "../utils/paths";

export interface PreparedScan {
  root: string;
  matcher: ExcludeMatcher;
  excludePatterns: string[];
  scanConcurrency?: number;
  configPath?: string;
}

export function resolveRoot(pathArg?: string): string {
  return pathArg ? expandPath(pathArg) : os.homedir();
}

export async function prepareScan(
  pathArg: string | undefined,
  cliExcludes: string[],
  cliConcurrency: number | undefined,
): Promise<PreparedScan> {
  const { config, filepath } = await loadConfig();
  const excludePatterns = [...(config.exclude ?? []), ...cliExcludes];
  return {
    root: resolveRoot(pathArg),
    matcher: createExcludeMatcher(excludePatterns),
    excludePatterns,
    scanConcurrency: cliConcurrency ?? config.concurrency,
    configPath: filepath,
  };
}

export async function runAnalyzeWithSpinner(
  prepared: PreparedScan,
): Promise<ScanResult[]> {
  const spinner = createSpinner(
    `Scanning ${contractHome(prepared.root)} for node_modules…`,
  ).start();
  try {
    const results = await analyze({
      root: prepared.root,
      exclude: prepared.matcher,
      scanConcurrency: prepared.scanConcurrency,
      onScanProgress: (found) => {
        spinner.text = `Scanning… found ${found} node_modules`;
      },
      onSizeProgress: (done, total) => {
        spinner.text = `Measuring sizes… ${done}/${total}`;
      },
    });
    spinner.stop();
    return results;
  } catch (err) {
    spinner.fail("Scan failed");
    throw err;
  }
}

export function printResultsPreview(
  results: ScanResult[],
  previewRows = SUMMARY_PREVIEW_ROWS,
): void {
  const shown = results.slice(0, previewRows);
  const rows = shown.map((r) => ({
    left: contractHome(r.path) + (r.error ? " (partial)" : ""),
    right: formatSize(r.size),
  }));
  for (const line of renderColumns(rows)) log.line("  " + line);
  const hidden = results.length - shown.length;
  if (hidden > 0) log.dim(`  … and ${hidden} more`);
}

export async function measureCachesWithSpinner(
  caches: CacheInfo[],
): Promise<CacheInfo[]> {
  const limit = pLimit(DEFAULT_SIZE_CONCURRENCY);
  const spinner = createSpinner("Measuring cache sizes…").start();
  try {
    const measured = await Promise.all(caches.map((c) => measureCache(c, limit)));
    spinner.stop();
    return measured;
  } catch (err) {
    spinner.fail("Failed to measure caches");
    throw err;
  }
}

export const removeConcurrency = DEFAULT_SIZE_CONCURRENCY;
