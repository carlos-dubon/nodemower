import pc from "picocolors";

const ART: readonly string[] = [
  "                  _",
  "  _ __   ___   __| | ___ _ __ ___   _____      _____ _ __",
  " | '_ \\ / _ \\ / _` |/ _ \\ '_ ` _ \\ / _ \\ \\ /\\ / / _ \\ '__|",
  " | | | | (_) | (_| |  __/ | | | | | (_) \\ V  V /  __/ |",
  " |_| |_|\\___/ \\__,_|\\___|_| |_| |_|\\___/ \\_/\\_/ \\___|_|",
];

const LINE_COLORS = [pc.green, pc.green, pc.cyan, pc.cyan, pc.blue];

export function renderBanner(): string {
  const art = ART.map((line, i) => (LINE_COLORS[i] ?? pc.cyan)(line)).join("\n");
  const tagline =
    pc.bold("nodemower") +
    pc.dim(" — clean up node_modules and package caches");
  return `\n${art}\n\n${tagline}\n`;
}

export function printBanner(): void {
  console.log(renderBanner());
}
