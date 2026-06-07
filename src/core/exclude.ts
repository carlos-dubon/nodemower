import { canonical, expandPath, isWithin } from "../utils/paths";

export type ExcludeMatcher = (absPath: string) => boolean;

export function createExcludeMatcher(patterns: readonly string[]): ExcludeMatcher {
  const normalized = [
    ...new Set(
      patterns
        .map((p) => p?.trim())
        .filter((p): p is string => Boolean(p))
        .map((p) => canonical(expandPath(p))),
    ),
  ];

  if (normalized.length === 0) return () => false;

  return (absPath: string): boolean => {
    const target = canonical(absPath);
    return normalized.some((excluded) => isWithin(excluded, target));
  };
}
