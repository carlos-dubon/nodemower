import pLimit from "p-limit";
import pc from "picocolors";
import { totalSize } from "../core/analyze";
import { cleanCache, detectCaches, type CacheCleanResult } from "../core/cache";
import { removeNodeModules } from "../core/remove";
import type { CacheInfo, RemoveResult, ScanResult } from "../types";
import { printBanner } from "../ui/banner";
import { formatSize, pluralize, renderColumns } from "../ui/format";
import { createSpinner, log } from "../ui/logger";
import {
  confirmAction,
  filterResults,
  selectCaches,
  selectNodeModules,
} from "../ui/prompts";
import { contractHome } from "../utils/paths";
import {
  measureCachesWithSpinner,
  prepareScan,
  printResultsPreview,
  removeConcurrency,
  runAnalyzeWithSpinner,
} from "./shared";

export interface CleanCommandOptions {
  exclude?: string[];
  concurrency?: number;
  filter?: string;
  caches?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  banner?: boolean;
}

export async function cleanCommand(
  pathArg: string | undefined,
  opts: CleanCommandOptions,
): Promise<void> {
  if (opts.banner !== false) printBanner();

  const prepared = await prepareScan(pathArg, opts.exclude ?? [], opts.concurrency);
  const results = await runAnalyzeWithSpinner(prepared);

  let selected: ScanResult[] = [];
  if (results.length === 0) {
    log.info("No node_modules directories found.");
  } else {
    log.success(
      `Found ${pc.bold(String(results.length))} ${pluralize(
        results.length,
        "node_modules directory",
        "node_modules directories",
      )} — ${formatSize(totalSize(results))}`,
    );
    log.line();
    printResultsPreview(results);
    log.line();

    selected = opts.yes
      ? opts.filter
        ? filterResults(results, opts.filter)
        : results
      : await selectNodeModules(results, { filter: opts.filter });
  }

  let cacheTargets: CacheInfo[] = [];
  if (opts.caches) {
    const detected = await detectCaches();
    const candidates = detected.filter((c) => c.installed && c.exists);
    if (candidates.length > 0) {
      const measured = await measureCachesWithSpinner(candidates);
      cacheTargets = opts.yes ? measured : await selectCaches(measured);
    } else {
      log.info("No package manager caches found to clear.");
    }
  }

  if (selected.length === 0 && cacheTargets.length === 0) {
    log.line();
    log.warn("Nothing selected — no changes made.");
    return;
  }

  const nmBytes = totalSize(selected);
  const cacheBytes = cacheTargets.reduce((sum, c) => sum + (c.size ?? 0), 0);
  const grandTotal = nmBytes + cacheBytes;

  log.line();
  log.line(pc.bold("Summary"));
  if (selected.length > 0) {
    log.step(
      `${selected.length} node_modules ${pluralize(
        selected.length,
        "directory",
        "directories",
      )} — ${pc.bold(formatSize(nmBytes))}`,
    );
  }
  if (cacheTargets.length > 0) {
    log.step(
      `${cacheTargets.length} ${pluralize(cacheTargets.length, "cache")} (${cacheTargets
        .map((c) => c.manager)
        .join(", ")}) — ${pc.bold(formatSize(cacheBytes))}`,
    );
  }
  log.line();
  log.line(`Total reclaimable space: ${pc.green(pc.bold(formatSize(grandTotal)))}`);

  if (opts.dryRun) {
    log.line();
    log.info("Dry run — the following would be deleted, but nothing was changed:");
    const rows = selected.map((r) => ({
      left: contractHome(r.path),
      right: formatSize(r.size),
    }));
    for (const line of renderColumns(rows)) log.line("  " + line);
    for (const c of cacheTargets) {
      log.line(`  ${c.manager} cache  ${pc.dim(formatSize(c.size))}`);
    }
    return;
  }

  if (!opts.yes) {
    log.line();
    const confirmed = await confirmAction(
      `Permanently delete the above and free ${formatSize(grandTotal)}? This cannot be undone.`,
    );
    if (!confirmed) {
      log.warn("Aborted — no changes made.");
      return;
    }
  }

  log.line();
  const removeResults = await deleteTargets(selected);

  const cacheResults: CacheCleanResult[] = [];
  if (cacheTargets.length > 0) {
    const spinner = createSpinner("Clearing caches…").start();
    for (const target of cacheTargets) {
      cacheResults.push(await cleanCache(target));
    }
    spinner.stop();
  }

  reportResults(removeResults, cacheResults);
}

async function deleteTargets(selected: ScanResult[]): Promise<RemoveResult[]> {
  if (selected.length === 0) return [];
  const limit = pLimit(removeConcurrency);
  const spinner = createSpinner(`Deleting 0/${selected.length}…`).start();
  let done = 0;
  const removeResults = await Promise.all(
    selected.map((r) =>
      limit(async () => {
        const res = await removeNodeModules(r.path, r.size);
        done += 1;
        spinner.text = `Deleting ${done}/${selected.length}…`;
        return res;
      }),
    ),
  );
  spinner.stop();
  return removeResults;
}

function reportResults(
  removeResults: RemoveResult[],
  cacheResults: CacheCleanResult[],
): void {
  const removed = removeResults.filter((r) => r.ok);
  const failed = removeResults.filter((r) => !r.ok);
  const cacheOk = cacheResults.filter((r) => r.ok);
  const cacheFailed = cacheResults.filter((r) => !r.ok);

  const freed =
    removed.reduce((sum, r) => sum + r.freed, 0) +
    cacheOk.reduce((sum, r) => sum + r.freed, 0);

  log.line();
  if (removed.length > 0) {
    log.success(
      `Deleted ${removed.length} node_modules ${pluralize(
        removed.length,
        "directory",
        "directories",
      )}`,
    );
  }
  if (cacheOk.length > 0) {
    log.success(
      `Cleared ${cacheOk.length} ${pluralize(cacheOk.length, "cache")} (${cacheOk
        .map((r) => r.manager)
        .join(", ")})`,
    );
  }
  for (const f of failed) {
    log.error(`Failed to delete ${contractHome(f.path)} — ${f.error}`);
  }
  for (const f of cacheFailed) {
    log.error(`Failed to clear ${f.manager} cache — ${f.error}`);
  }

  log.line();
  log.success(`Total reclaimed: ${pc.green(pc.bold(formatSize(freed)))}`);

  if (failed.length > 0 || cacheFailed.length > 0) {
    process.exitCode = 1;
  }
}
