import pc from "picocolors";
import prettyBytes from "pretty-bytes";

export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined || bytes < 0) return "—";
  return prettyBytes(bytes);
}

export function truncateStart(value: string, max: number): string {
  if (value.length <= max) return value;
  if (max <= 1) return value.slice(value.length - max);
  return "…" + value.slice(value.length - (max - 1));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export interface Column {
  left: string;
  right: string;
}

export function renderColumns(
  rows: Column[],
  opts: { gap?: number; maxWidth?: number; dimRight?: boolean } = {},
): string[] {
  if (rows.length === 0) return [];
  const gap = opts.gap ?? 2;
  const maxWidth = opts.maxWidth ?? process.stdout.columns ?? 80;
  const dimRight = opts.dimRight ?? true;

  const rightWidth = Math.max(...rows.map((r) => r.right.length));
  const leftBudget = Math.max(10, maxWidth - rightWidth - gap);

  return rows.map((r) => {
    // Pad before coloring so the visible columns stay aligned.
    const left = truncateStart(r.left, leftBudget).padEnd(leftBudget);
    const right = r.right.padStart(rightWidth);
    return `${left}${" ".repeat(gap)}${dimRight ? pc.dim(right) : right}`;
  });
}
