import os from "node:os";
import pc from "picocolors";
import { detectCaches } from "../core/cache";
import { loadConfig } from "../core/config";
import { printBanner } from "../ui/banner";
import { formatSize } from "../ui/format";
import { log } from "../ui/logger";
import { contractHome } from "../utils/paths";
import { getVersion } from "../version";
import { measureCachesWithSpinner } from "./shared";

export interface DoctorOptions {
  banner?: boolean;
}

export async function doctorCommand(opts: DoctorOptions = {}): Promise<void> {
  if (opts.banner !== false) printBanner();

  log.line(pc.bold("Environment"));
  log.step(`${"nodemower".padEnd(12)}${getVersion()}`);
  log.step(`${"node".padEnd(12)}${process.version}`);
  log.step(`${"platform".padEnd(12)}${process.platform} ${process.arch}`);
  log.step(`${"home".padEnd(12)}${os.homedir()}`);
  log.line();

  const { filepath } = await loadConfig();
  log.line(pc.bold("Configuration"));
  log.step(
    `${"config".padEnd(12)}${filepath ? contractHome(filepath) : pc.dim("none found")}`,
  );
  log.step(`${"scan root".padEnd(12)}${contractHome(os.homedir())} ${pc.dim("(default)")}`);
  log.line();

  log.line(pc.bold("Package managers"));
  const detected = await detectCaches();
  const installed = detected.filter((c) => c.installed);
  const measured = installed.length > 0 ? await measureCachesWithSpinner(installed) : [];
  const measuredByManager = new Map(measured.map((c) => [c.manager, c]));

  for (const c of detected) {
    if (!c.installed) {
      log.step(`${c.manager.padEnd(6)}${pc.dim("not installed")}`);
      continue;
    }
    const m = measuredByManager.get(c.manager) ?? c;
    const version = (m.version ?? "").padEnd(10);
    const size = formatSize(m.exists ? m.size : 0).padStart(9);
    const location = m.exists && m.cachePath ? contractHome(m.cachePath) : pc.dim("(empty)");
    log.step(`${c.manager.padEnd(6)}${pc.dim(version)}${pc.cyan(size)}  ${pc.dim(location)}`);
  }

  const total = measured.reduce((s, c) => s + (c.size ?? 0), 0);
  log.line();
  log.success(`${installed.length} package manager(s) detected · ${formatSize(total)} of cache`);
}
