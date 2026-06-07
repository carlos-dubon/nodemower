export interface ScanResult {
  path: string;
  size: number;
  error?: string;
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
