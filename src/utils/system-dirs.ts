// Directory names we never descend into: large, system-owned, or cache
// locations that never hold reclaimable project deps. Matched case-insensitively.
const SKIP_DIR_NAMES: readonly string[] = [
  ".git",
  ".hg",
  ".svn",

  ".cache",
  ".trash",
  ".trashes",
  "$recycle.bin",

  // Package-manager stores & caches (the `cache` commands handle these).
  ".npm",
  ".pnpm-store",
  ".bun",
  ".deno",
  ".yarn",

  "library",
  "applications",
  "system",
  "private",
  "volumes",

  "windows",
  "program files",
  "program files (x86)",
  "programdata",
  "appdata",
];

export function getSkipDirs(extra: readonly string[] = []): Set<string> {
  const set = new Set(SKIP_DIR_NAMES);
  for (const name of extra) set.add(name.toLowerCase());
  return set;
}
