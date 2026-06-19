# nodemower

```text
                  _
  _ __   ___   __| | ___ _ __ ___   _____      _____ _ __
 | '_ \ / _ \ / _` |/ _ \ '_ ` _ \ / _ \ \ /\ / / _ \ '__|
 | | | | (_) | (_| |  __/ | | | | | (_) \ V  V /  __/ |
 |_| |_|\___/ \__,_|\___|_| |_| |_|\___/ \_/\_/ \___|_|
```

> Reclaim disk space by finding and cleaning up `node_modules` directories and JavaScript package manager caches.

`nodemower` scans your machine, shows exactly how much space you can recover, lets you interactively pick what to remove, and can clear `npm` / `pnpm` / `yarn` / `bun` / `deno` caches too — with a dry-run mode and explicit confirmation so you never delete something by accident.

- 🚀 **Fast** — concurrent traversal that streams results and never descends into a `node_modules` it already found.
- 🎯 **Interactive** — a searchable checklist, everything selected by default, sizes shown inline.
- 🛟 **Safe** — dry-run, a summary, explicit confirmation, and a hard guard that refuses to delete anything not named `node_modules`.
- 🧹 **Cache-aware** — detect installed package managers and reclaim their caches.
- 🖥️ **Cross-platform** — first-class macOS and Windows support (Linux works too).

## Install

```bash
npm install -g nodemower
# or run without installing:
npx nodemower scan
```

Requires **Node.js 20+**.

## Quick start

```bash
nodemower scan            # see what's reclaimable (read-only)
nodemower clean           # interactively delete node_modules
nodemower clean --caches  # ...and offer to clear package manager caches
nodemower doctor          # environment + detected package managers
```

By default scans start at your home directory. Pass a path to narrow it:

```bash
nodemower scan ~/projects
nodemower clean "C:\work"
```

## Commands

| Command | Description |
| --- | --- |
| `nodemower scan [path]` | Scan for `node_modules` and report reclaimable space. Read-only. |
| `nodemower clean [path]` | Scan, then interactively delete `node_modules` (and optionally caches). |
| `nodemower cache analyze` | Show detected package managers and their cache sizes. |
| `nodemower cache clean` | Interactively clear package manager caches. |
| `nodemower doctor` | Show environment, config, and detected package managers. |

### Common options

| Option | Applies to | Description |
| --- | --- | --- |
| `-e, --exclude <path...>` | `scan`, `clean` | Exclude a path (repeatable). |
| `-c, --concurrency <n>` | `scan`, `clean` | Directory traversal concurrency. |
| `--filter <text>` | `clean` | Preselect only results matching a substring. |
| `--caches` | `clean` | Also offer package manager caches for cleanup. |
| `--dry-run` | `clean`, `cache clean` | Show what would happen; make no changes. |
| `-y, --yes` | `clean`, `cache clean` | Skip prompts: select everything and confirm automatically. |
| `--json` | `scan`, `cache analyze` | Machine-readable output (no banner/spinner). |
| `--no-banner` | all | Don't print the ASCII banner. |

### Examples

```bash
# Keep the current project, clean everything else under ~/projects
nodemower clean ~/projects --exclude "$(pwd)"

# Preview a full cleanup including caches, without touching anything
nodemower clean --caches --dry-run

# Non-interactive cleanup (CI / scripts): delete all found node_modules
nodemower clean ~/scratch --yes

# Pipe scan results into other tools
nodemower scan ~/code --json | jq '.results[] | select(.bytes > 1e9)'
```

## Configuration

`nodemower` reads configuration via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig). Drop a file in your project (or home directory) — for example `.nodemowerrc.json`:

```json
{
  "exclude": [
    "~/projects/my-app",
    "~/work/client-projects"
  ],
  "concurrency": 32
}
```

Supported locations include `.nodemowerrc`, `.nodemowerrc.{json,yaml,js,cjs}`, `nodemower.config.{js,cjs,mjs,ts}`, and a `"nodemower"` key in `package.json`. Project config is merged with a global config in your home directory; `exclude` lists from both (plus any `--exclude` flags) are combined. Excluded directories never appear in scan results.

## Safety

Deleting dependencies is destructive, so `nodemower` is conservative by design:

- **Dry-run** (`--dry-run`) performs every calculation and prints exactly what would be removed, but changes nothing.
- A **summary and total** are always shown before deletion.
- Deletion requires **explicit confirmation** (unless you opt in with `--yes`).
- Removal is guarded: the engine **refuses to delete any path not named `node_modules`**.
- Failures are isolated and **reported per item** (successful vs. failed), and a non-zero exit code is returned if anything failed.

> Package-manager caches are cleared using each tool's own command where possible (`npm cache clean --force`, `pnpm store prune`, `yarn cache clean`, `bun pm cache rm`, `deno clean`), falling back to removing the cache directory. These are safe to clear — the package managers simply repopulate them on demand. Note that `pnpm store prune` only removes packages not referenced by any existing install.

## How it works

- **Traversal** is a bounded-concurrency walk (`p-limit` + `fs.readdir`) that streams matches, never follows symlinks, and never recurses into a discovered `node_modules`. It also skips directories whose `node_modules` belong to an installed tool rather than a rebuildable project — system/cache dirs, editor data (`.vscode`, `.vscode-server`, `.cursor`, …), node version managers (`.nvm`, `.volta`, `.asdf`, …), and app-data roots (`Library`, `AppData`, `.config`, `.local`).
- **Sizing** uses the system `du` on macOS/Linux (fast, reports true on-disk usage) with a concurrent recursive `stat` fallback on Windows.
- **Deletion** uses [`rimraf`](https://github.com/isaacs/rimraf) for robust cross-platform removal.

## Programmatic API

The core engine is also exported for use in scripts:

```ts
import { analyze, createExcludeMatcher, detectCaches } from "nodemower";
import os from "node:os";

const results = await analyze({
  root: os.homedir(),
  exclude: createExcludeMatcher(["~/keep-this"]),
});

for (const { path, size } of results) {
  console.log(path, size);
}
```

## Development

```bash
npm install
npm run build       # bundle with tsdown
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run dev         # watch build
```

## License

[MIT](./LICENSE) © Carlos Daniel Dubón
