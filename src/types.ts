export interface ScanResult {
  path: string;
  size: number;
  error?: string;
}

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "deno";

export interface CacheInfo {
  manager: PackageManager;
  installed: boolean;
  version?: string;
  cachePath?: string;
  exists: boolean;
  size?: number;
}

export interface RemoveResult {
  path: string;
  ok: boolean;
  freed: number;
  error?: string;
}

export interface NodemowerConfig {
  exclude?: string[];
  concurrency?: number;
}
