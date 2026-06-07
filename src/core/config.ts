import os from "node:os";
import { cosmiconfig } from "cosmiconfig";
import type { NodemowerConfig } from "../types";

export interface LoadedConfig {
  config: NodemowerConfig;
  filepath?: string;
}

// Project config (from cwd, wins) merged with global config (from home).
export async function loadConfig(cwd = process.cwd()): Promise<LoadedConfig> {
  const explorer = cosmiconfig("nodemower");
  const home = os.homedir();

  const project = await safeSearch(explorer, cwd);
  const global = cwd === home ? null : await safeSearch(explorer, home);

  if (!project && !global) return { config: {} };

  const merged: NodemowerConfig = {
    exclude: [
      ...(global?.config.exclude ?? []),
      ...(project?.config.exclude ?? []),
    ],
    concurrency: project?.config.concurrency ?? global?.config.concurrency,
  };

  return { config: merged, filepath: project?.filepath ?? global?.filepath };
}

async function safeSearch(
  explorer: ReturnType<typeof cosmiconfig>,
  from: string,
): Promise<{ config: NodemowerConfig; filepath: string } | null> {
  try {
    const result = await explorer.search(from);
    if (!result || result.isEmpty) return null;
    return { config: (result.config ?? {}) as NodemowerConfig, filepath: result.filepath };
  } catch {
    return null; // ignore malformed config files
  }
}
