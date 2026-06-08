import pLimit from "p-limit";
import pc from "picocolors";
import { DEFAULT_SIZE_CONCURRENCY } from "../constants";
import { cleanCache, detectCaches, measureCache } from "../core/cache";
import type { CacheInfo } from "../types";
import { printBanner } from "../ui/banner";
import { formatSize, pluralize } from "../ui/format";
import { createSpinner, log } from "../ui/logger";
import { confirmAction, selectCaches } from "../ui/prompts";
import { contractHome } from "../utils/paths";
import { measureCachesWithSpinner } from "./shared";

export interface CacheAnalyzeOptions {
  json?: boolean;
  banner?: boolean;
}

export async function cacheAnalyzeCommand(opts: CacheAnalyzeOptions): Promise<void> {
  const detected = await detectCaches();
  const installed = detected.filter((c) => c.installed);

  if (opts.json) {
    const limit = pLimit(DEFAULT_SIZE_CONCURRENCY);
    const measured = await Promise.all(
      installed.map((c) => measureCache(c, limit)),
    );
    process.stdout.write(
      JSON.stringify(
        {
          totalBytes: measured.reduce((s, c) => s + (c.size ?? 0), 0),
          caches: measured.map((c) => ({
            manager: c.manager,
            version: c.version,
            cachePath: c.cachePath,
            exists: c.exists,
            bytes: c.size ?? 0,
          })),
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (opts.banner !== false) printBanner();

  if (installed.length === 0) {
    log.warn("No supported package managers detected.");
    return;
  }

  const measured = await measureCachesWithSpinner(installed);
  log.success(
    `Detected ${installed.length} package ${pluralize(installed.length, "manager")}`,
  );
  log.line();
  for (const c of measured) printCacheRow(c);
  log.line();
  const total = measured.reduce((s, c) => s + (c.size ?? 0), 0);
  log.success(`Total cache space: ${pc.bold(formatSize(total))}`);
}

function printCacheRow(c: CacheInfo): void {
  const manager = c.manager.padEnd(6);
  const version = (c.version ?? "").padEnd(10);
  const size = formatSize(c.exists ? c.size : 0).padStart(9);
  const location = c.exists && c.cachePath ? contractHome(c.cachePath) : "(empty)";
  log.line(
    `  ${pc.bold(manager)}${pc.dim(version)}${pc.cyan(size)}  ${pc.dim(location)}`,
  );
}

export interface CacheCleanOptions {
  dryRun?: boolean;
  yes?: boolean;
  banner?: boolean;
}

export async function cacheCleanCommand(opts: CacheCleanOptions): Promise<void> {
  if (opts.banner !== false) printBanner();

  const detected = await detectCaches();
  const candidates = detected.filter((c) => c.installed && c.exists);

  if (candidates.length === 0) {
    log.success("No package manager caches found to clean.");
    return;
  }

  const measured = await measureCachesWithSpinner(candidates);
  log.line();
  for (const c of measured) printCacheRow(c);
  log.line();

  const targets = opts.yes ? measured : await selectCaches(measured);
  if (targets.length === 0) {
    log.warn("Nothing selected — no changes made.");
    return;
  }

  const total = targets.reduce((s, c) => s + (c.size ?? 0), 0);
  log.line(`Total reclaimable: ${pc.green(pc.bold(formatSize(total)))}`);

  if (opts.dryRun) {
    log.line();
    log.info("Dry run — no caches were cleared.");
    return;
  }

  if (!opts.yes) {
    log.line();
    const confirmed = await confirmAction(
      `Clear ${targets.length} ${pluralize(targets.length, "cache")} and free ~${formatSize(total)}?`,
    );
    if (!confirmed) {
      log.warn("Aborted — no changes made.");
      return;
    }
  }

  log.line();
  const spinner = createSpinner("Clearing caches…").start();
  const results = [];
  for (const target of targets) {
    results.push(await cleanCache(target));
  }
  spinner.stop();

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const freed = ok.reduce((s, r) => s + r.freed, 0);

  for (const f of failed) log.error(`Failed to clear ${f.manager} cache — ${f.error}`);
  if (ok.length > 0) {
    log.success(
      `Cleared ${ok.length} ${pluralize(ok.length, "cache")} (${ok.map((r) => r.manager).join(", ")})`,
    );
  }
  log.success(`Total reclaimed: ${pc.green(pc.bold(formatSize(freed)))}`);

  if (failed.length > 0) process.exitCode = 1;
}
