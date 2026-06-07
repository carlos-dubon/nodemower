import pLimit from "p-limit";
import pc from "picocolors";
import { totalSize } from "../core/analyze";
import { removeNodeModules } from "../core/remove";
import type { RemoveResult, ScanResult } from "../types";
import { printBanner } from "../ui/banner";
import { formatSize, pluralize, renderColumns } from "../ui/format";
import { createSpinner, log } from "../ui/logger";
import { confirmAction, filterResults, selectNodeModules } from "../ui/prompts";
import { contractHome } from "../utils/paths";
import {
  prepareScan,
  printResultsPreview,
  removeConcurrency,
  runAnalyzeWithSpinner,
} from "./shared";

export interface CleanCommandOptions {
  exclude?: string[];
  concurrency?: number;
  filter?: string;
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

  if (results.length === 0) {
    log.info("No node_modules directories found.");
    return;
  }

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

  const selected: ScanResult[] = opts.yes
    ? opts.filter
      ? filterResults(results, opts.filter)
      : results
    : await selectNodeModules(results, { filter: opts.filter });

  if (selected.length === 0) {
    log.line();
    log.warn("Nothing selected — no changes made.");
    return;
  }

  const nmBytes = totalSize(selected);

  log.line();
  log.line(pc.bold("Summary"));
  log.step(
    `${selected.length} node_modules ${pluralize(
      selected.length,
      "directory",
      "directories",
    )} — ${pc.bold(formatSize(nmBytes))}`,
  );
  log.line();
  log.line(`Total reclaimable space: ${pc.green(pc.bold(formatSize(nmBytes)))}`);

  if (opts.dryRun) {
    log.line();
    log.info("Dry run — the following would be deleted, but nothing was changed:");
    const rows = selected.map((r) => ({
      left: contractHome(r.path),
      right: formatSize(r.size),
    }));
    for (const line of renderColumns(rows)) log.line("  " + line);
    return;
  }

  if (!opts.yes) {
    log.line();
    const confirmed = await confirmAction(
      `Permanently delete the above and free ${formatSize(nmBytes)}? This cannot be undone.`,
    );
    if (!confirmed) {
      log.warn("Aborted — no changes made.");
      return;
    }
  }

  log.line();
  const removeResults = await deleteTargets(selected);
  reportResults(removeResults);
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

function reportResults(removeResults: RemoveResult[]): void {
  const removed = removeResults.filter((r) => r.ok);
  const failed = removeResults.filter((r) => !r.ok);
  const freed = removed.reduce((sum, r) => sum + r.freed, 0);

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
  for (const f of failed) {
    log.error(`Failed to delete ${contractHome(f.path)} — ${f.error}`);
  }

  log.line();
  log.success(`Total reclaimed: ${pc.green(pc.bold(formatSize(freed)))}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}
