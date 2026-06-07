import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { LimitFunction } from "p-limit";
import type { CacheInfo, PackageManager } from "../types";
import { removePath } from "./remove";
import { getDirSize } from "./size";

const execFileAsync = promisify(execFile);

export const PACKAGE_MANAGERS: readonly PackageManager[] = [
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "deno",
];

// On Windows these binaries are `.cmd` shims that only resolve through a shell.
// Every command/arg below is a fixed constant, so this isn't an injection risk.
function execOptions(signal?: AbortSignal) {
  return {
    timeout: 8000,
    windowsHide: true,
    shell: process.platform === "win32",
    signal,
  } as const;
}

async function run(cmd: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(cmd, args, execOptions());
    return stdout.trim();
  } catch {
    return undefined;
  }
}

async function runOk(cmd: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(cmd, args, execOptions());
    return true;
  } catch {
    return false;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function notInstalled(manager: PackageManager): CacheInfo {
  return { manager, installed: false, exists: false };
}

async function finalize(
  manager: PackageManager,
  version: string,
  cachePath: string | undefined,
): Promise<CacheInfo> {
  const resolved = cachePath ? path.resolve(cachePath) : undefined;
  const exists = resolved ? await pathExists(resolved) : false;
  return { manager, installed: true, version, cachePath: resolved, exists };
}

async function detectNpm(): Promise<CacheInfo> {
  const version = await run("npm", ["--version"]);
  if (!version) return notInstalled("npm");
  const cachePath =
    (await run("npm", ["config", "get", "cache"])) ||
    path.join(os.homedir(), ".npm");
  return finalize("npm", version, cachePath);
}

async function detectPnpm(): Promise<CacheInfo> {
  const version = await run("pnpm", ["--version"]);
  if (!version) return notInstalled("pnpm");
  const cachePath = await run("pnpm", ["store", "path"]);
  return finalize("pnpm", version, cachePath);
}

async function detectYarn(): Promise<CacheInfo> {
  const version = await run("yarn", ["--version"]);
  if (!version) return notInstalled("yarn");
  const cachePath = version.startsWith("1.")
    ? await run("yarn", ["cache", "dir"])
    : await run("yarn", ["config", "get", "cacheFolder"]);
  return finalize("yarn", version, cachePath);
}

async function detectBun(): Promise<CacheInfo> {
  const version = await run("bun", ["--version"]);
  if (!version) return notInstalled("bun");
  const cachePath =
    (await run("bun", ["pm", "cache"])) ||
    path.join(os.homedir(), ".bun", "install", "cache");
  return finalize("bun", version, cachePath);
}

async function detectDeno(): Promise<CacheInfo> {
  const raw = await run("deno", ["--version"]);
  // e.g. "deno 1.40.0 (release, aarch64-apple-darwin)"
  const version = raw?.split("\n", 1)[0]?.split(/\s+/)[1];
  if (!version) return notInstalled("deno");
  const cachePath = (await denoDir()) ?? defaultDenoDir();
  return finalize("deno", version, cachePath);
}

async function denoDir(): Promise<string | undefined> {
  const out = await run("deno", ["info", "--json"]);
  if (!out) return undefined;
  try {
    const parsed = JSON.parse(out) as { denoDir?: string };
    return parsed.denoDir;
  } catch {
    return undefined;
  }
}

function defaultDenoDir(): string {
  if (process.platform === "win32") {
    const local =
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(local, "deno");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Caches", "deno");
  }
  const xdg = process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache");
  return path.join(xdg, "deno");
}

export async function detectCaches(): Promise<CacheInfo[]> {
  return Promise.all([
    detectNpm(),
    detectPnpm(),
    detectYarn(),
    detectBun(),
    detectDeno(),
  ]);
}

export async function measureCache(
  info: CacheInfo,
  limit: LimitFunction,
  signal?: AbortSignal,
): Promise<CacheInfo> {
  if (!info.exists || !info.cachePath) return { ...info, size: 0 };
  const { size } = await getDirSize(info.cachePath, limit, signal);
  return { ...info, size };
}

export interface CacheCleanResult {
  manager: PackageManager;
  ok: boolean;
  freed: number;
  error?: string;
}

function cleanArgsFor(info: CacheInfo): string[] | undefined {
  switch (info.manager) {
    case "npm":
      return ["cache", "clean", "--force"];
    case "pnpm":
      // `store prune` only removes packages not referenced by any project.
      return ["store", "prune"];
    case "yarn":
      return info.version?.startsWith("1.")
        ? ["cache", "clean"]
        : ["cache", "clean", "--all"];
    case "bun":
      return ["pm", "cache", "rm"];
    case "deno":
      return ["clean"];
  }
}

export async function cleanCache(info: CacheInfo): Promise<CacheCleanResult> {
  const freed = info.size ?? 0;
  const args = cleanArgsFor(info);

  if (args && (await runOk(info.manager, args))) {
    return { manager: info.manager, ok: true, freed };
  }

  if (info.cachePath && info.exists && (await removePath(info.cachePath))) {
    return { manager: info.manager, ok: true, freed };
  }

  return {
    manager: info.manager,
    ok: false,
    freed: 0,
    error: "could not clear cache (command failed and directory was not removable)",
  };
}
