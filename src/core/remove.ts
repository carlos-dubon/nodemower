import path from "node:path";
import { rimraf } from "rimraf";
import { NODE_MODULES } from "../constants";
import type { RemoveResult } from "../types";
import { errorMessage } from "../utils/errors";

export async function removeNodeModules(
  target: string,
  knownSize: number,
): Promise<RemoveResult> {
  if (path.basename(target) !== NODE_MODULES) {
    return {
      path: target,
      ok: false,
      freed: 0,
      error: `refusing to delete non-node_modules path: ${target}`,
    };
  }

  try {
    await rimraf(target);
    return { path: target, ok: true, freed: knownSize };
  } catch (err) {
    return { path: target, ok: false, freed: 0, error: errorMessage(err) };
  }
}

export async function removePath(target: string): Promise<boolean> {
  try {
    await rimraf(target);
    return true;
  } catch {
    return false;
  }
}
