#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import { cleanCommand } from "./commands/clean";
import { scanCommand } from "./commands/scan";
import { printBanner } from "./ui/banner";
import { log } from "./ui/logger";
import { errorMessage, isPromptCancellation } from "./utils/errors";
import { getVersion } from "./version";

function parseConcurrency(value: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) {
    throw new InvalidArgumentError("must be a positive integer");
  }
  return n;
}

function buildProgram(): Command {
  const program = new Command();

  program
    .name("nodemower")
    .description("Reclaim disk space from node_modules and package manager caches.")
    .version(getVersion(), "-v, --version", "output the version number");

  program
    .command("scan [path]")
    .description("scan for node_modules and report reclaimable space")
    .option("-e, --exclude <path...>", "exclude a path (repeatable)")
    .option("-c, --concurrency <n>", "directory traversal concurrency", parseConcurrency)
    .option("--no-banner", "do not print the ASCII banner")
    .action(scanCommand);

  program
    .command("clean [path]")
    .description("scan, then interactively delete node_modules")
    .option("-e, --exclude <path...>", "exclude a path (repeatable)")
    .option("-c, --concurrency <n>", "directory traversal concurrency", parseConcurrency)
    .option("--filter <text>", "preselect only results matching a substring")
    .option("--dry-run", "show what would be deleted without deleting anything")
    .option("-y, --yes", "skip prompts: select everything and confirm automatically")
    .option("--no-banner", "do not print the ASCII banner")
    .action(cleanCommand);

  return program;
}

async function main(): Promise<void> {
  const program = buildProgram();

  // No subcommand: show the banner and help instead of an error.
  if (process.argv.length <= 2) {
    printBanner();
    program.outputHelp();
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  if (isPromptCancellation(err)) {
    log.line();
    log.warn("Cancelled.");
    process.exit(130);
  }
  log.error(errorMessage(err));
  process.exit(1);
});
