import pLimit from "p-limit";
import pc from "picocolors";
import { DEFAULT_SIZE_CONCURRENCY } from "../constants";
import { detectCaches, measureCache } from "../core/cache";
import type { CacheInfo } from "../types";
import { printBanner } from "../ui/banner";
import { formatSize, pluralize } from "../ui/format";
import { log } from "../ui/logger";
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
