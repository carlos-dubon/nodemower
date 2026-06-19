# nodemower

```text
                  _
  _ __   ___   __| | ___ _ __ ___   _____      _____ _ __
 | '_ \ / _ \ / _` |/ _ \ '_ ` _ \ / _ \ \ /\ / / _ \ '__|
 | | | | (_) | (_| |  __/ | | | | | (_) \ V  V /  __/ |
 |_| |_|\___/ \__,_|\___|_| |_| |_|\___/ \_/\_/ \___|_|
```

Old `node_modules` directories pile up fast and quietly eat a lot of disk. nodemower
finds them, tells you how much space each one is worth, and lets you pick what to
delete from an interactive list. While it's at it, it can also clear your npm, pnpm,
yarn, bun, or deno caches.

Nothing is removed without a confirmation, and there's a `--dry-run` flag for when you
just want to see what would happen.

## Install

```bash
npm install -g nodemower
```

Or run it once without installing:

```bash
npx nodemower scan
```

Needs Node.js 20 or newer.

## Quick start

```bash
nodemower scan            # see what's reclaimable; changes nothing
nodemower clean           # pick node_modules to delete
nodemower clean --caches  # also offer to clear package manager caches
nodemower doctor          # show your environment and detected package managers
```

Scans start from your home directory. Pass a path to look somewhere narrower:

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

### Options

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

# Non-interactive cleanup for CI or scripts
nodemower clean ~/scratch --yes

# Pipe scan results into other tools
nodemower scan ~/code --json | jq '.results[] | select(.bytes > 1e9)'
```

## Configuration

nodemower loads config through [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig),
so you can drop a file in your project or home directory. For example, `.nodemowerrc.json`:

```json
{
  "exclude": [
    "~/projects/my-app",
    "~/work/client-projects"
  ],
  "concurrency": 32
}
```

The usual cosmiconfig locations all work: `.nodemowerrc`, `.nodemowerrc.{json,yaml,js,cjs}`,
`nodemower.config.{js,cjs,mjs,ts}`, or a `"nodemower"` key in `package.json`. A project
config is merged on top of a global one in your home directory, and the `exclude` lists
from both — together with anything you pass via `--exclude` — are combined. Excluded paths
never show up in scan results.

## Safety

Deleting dependencies is destructive, so nodemower stays on the cautious side:

- `--dry-run` runs the whole scan and sizing pass and prints what it would remove, but
  doesn't touch anything.
- You always see a summary and a total before anything is deleted.
- Deletion needs an explicit confirmation unless you pass `--yes`.
- As a backstop, the remover refuses to delete any path that isn't named `node_modules`.
- If one delete fails the rest still run; you get a per-item report and a non-zero exit
  code when anything failed.

Caches are cleared with each tool's own command where there is one (`npm cache clean
--force`, `pnpm store prune`, `yarn cache clean`, `bun pm cache rm`, `deno clean`), and
fall back to removing the cache directory otherwise. Clearing them is safe; the package
managers just repopulate on demand. Note that `pnpm store prune` only drops packages no
existing install references.

## How it works

The scan is a bounded-concurrency walk (`p-limit` plus `fs.readdir`) that streams matches
as it finds them. It doesn't follow symlinks, and once it hits a `node_modules` it stops
rather than recursing into it. It also stays out of directories whose `node_modules`
belong to an installed tool rather than a project you can rebuild — system and cache
folders, editor data such as `.vscode` and `.cursor`, node version managers like `.nvm`
and `.volta`, and app-data roots like `Library`, `AppData`, `.config`, and `.local`.

Sizing uses the system `du` on macOS and Linux, which is fast and reports true on-disk
usage; Windows falls back to a concurrent recursive `stat`. Deletion goes through
[rimraf](https://github.com/isaacs/rimraf) so it behaves consistently across platforms.

## Programmatic API

The core engine is exported too, if you want to use it from a script:

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
