import os from "node:os";
import path from "node:path";
import untildify from "untildify";

// macOS (APFS) and Windows (NTFS) are case-insensitive by default.
const CASE_INSENSITIVE_FS =
  process.platform === "win32" || process.platform === "darwin";

export function expandPath(input: string): string {
  return path.resolve(untildify(input.trim()));
}

export function canonical(absPath: string): string {
  const resolved = path.resolve(absPath);
  return CASE_INSENSITIVE_FS ? resolved.toLowerCase() : resolved;
}

export function contractHome(absPath: string): string {
  const home = os.homedir();
  if (absPath === home) return "~";
  const prefix = home + path.sep;
  if (absPath.startsWith(prefix)) {
    return "~" + path.sep + absPath.slice(prefix.length);
  }
  return absPath;
}

// Both arguments must already be canonical.
export function isWithin(parent: string, child: string): boolean {
  if (child === parent) return true;
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
