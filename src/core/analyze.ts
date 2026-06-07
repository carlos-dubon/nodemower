import pLimit from "p-limit";
import {
  DEFAULT_SCAN_CONCURRENCY,
  DEFAULT_SIZE_CONCURRENCY,
} from "../constants";
import type { ScanResult } from "../types";
import type { ExcludeMatcher } from "./exclude";
import { scan } from "./scanner";
import { getDirSize } from "./size";

export interface AnalyzeOptions {
  root: string;
  exclude: ExcludeMatcher;
  scanConcurrency?: number;
  sizeConcurrency?: number;
  signal?: AbortSignal;
  onScanProgress?: (found: number) => void;
  onSizeProgress?: (measured: number, total: number) => void;
}

export async function analyze(options: AnalyzeOptions): Promise<ScanResult[]> {
  const {
    root,
    exclude,
    scanConcurrency = DEFAULT_SCAN_CONCURRENCY,
    sizeConcurrency = DEFAULT_SIZE_CONCURRENCY,
    signal,
    onScanProgress,
    onSizeProgress,
  } = options;

  let foundCount = 0;
  const paths = await scan({
    root,
    exclude,
    concurrency: scanConcurrency,
    signal,
    onFound: () => onScanProgress?.(++foundCount),
  });

  const sizeLimit = pLimit(sizeConcurrency);
  let measured = 0;
  const results = await Promise.all(
    paths.map(async (target): Promise<ScanResult> => {
      const { size, error } = await getDirSize(target, sizeLimit, signal);
      onSizeProgress?.(++measured, paths.length);
      return { path: target, size, error };
    }),
  );

  results.sort((a, b) => b.size - a.size);
  return results;
}

export function totalSize(results: readonly ScanResult[]): number {
  return results.reduce((sum, r) => sum + r.size, 0);
}
