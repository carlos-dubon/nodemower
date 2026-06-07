import pc from "picocolors";
import { totalSize } from "../core/analyze";
import { formatSize, pluralize } from "../ui/format";
import { printBanner } from "../ui/banner";
import { log } from "../ui/logger";
import { prepareScan, printResultsPreview, runAnalyzeWithSpinner } from "./shared";

export interface ScanCommandOptions {
  exclude?: string[];
  concurrency?: number;
  banner?: boolean;
}

export async function scanCommand(
  pathArg: string | undefined,
  opts: ScanCommandOptions,
): Promise<void> {
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
