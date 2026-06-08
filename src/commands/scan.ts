import pc from "picocolors";
import { analyze, totalSize } from "../core/analyze";
import { createExcludeMatcher } from "../core/exclude";
import { formatSize, pluralize } from "../ui/format";
import { printBanner } from "../ui/banner";
import { log } from "../ui/logger";
import { prepareScan, printResultsPreview, runAnalyzeWithSpinner, resolveRoot } from "./shared";

export interface ScanCommandOptions {
  exclude?: string[];
  concurrency?: number;
  json?: boolean;
  banner?: boolean;
}

export async function scanCommand(
  pathArg: string | undefined,
  opts: ScanCommandOptions,
): Promise<void> {
  if (opts.json) {
    const root = resolveRoot(pathArg);
    const results = await analyze({
      root,
      exclude: createExcludeMatcher(opts.exclude ?? []),
    });
    process.stdout.write(
      JSON.stringify(
        {
          root,
          count: results.length,
          totalBytes: totalSize(results),
          results: results.map((r) => ({
            path: r.path,
            bytes: r.size,
            error: r.error,
          })),
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (opts.banner !== false) printBanner();

  const prepared = await prepareScan(pathArg, opts.exclude ?? [], opts.concurrency);
  const results = await runAnalyzeWithSpinner(prepared);

  if (results.length === 0) {
    log.success("No node_modules directories found. Your disk is tidy. ✨");
    return;
  }

  log.success(
    `Found ${pc.bold(String(results.length))} ${pluralize(
      results.length,
      "node_modules directory",
      "node_modules directories",
    )}`,
  );
  log.line();
  printResultsPreview(results);
  log.line();
  log.success(
    `Potential space savings: ${pc.bold(formatSize(totalSize(results)))}`,
  );
}
