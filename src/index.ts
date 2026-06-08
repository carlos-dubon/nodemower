export { analyze, totalSize, type AnalyzeOptions } from "./core/analyze";
export { scan, type ScanOptions } from "./core/scanner";
export { getDirSize, type DirSize } from "./core/size";
export { createExcludeMatcher, type ExcludeMatcher } from "./core/exclude";
export {
  cleanCache,
  detectCaches,
  measureCache,
  PACKAGE_MANAGERS,
  type CacheCleanResult,
} from "./core/cache";
export { removeNodeModules, removePath } from "./core/remove";
export { loadConfig, type LoadedConfig } from "./core/config";
export { getVersion } from "./version";
export type {
  CacheInfo,
  NodemowerConfig,
  PackageManager,
  RemoveResult,
  ScanResult,
} from "./types";
