# diff-lockfiles

Note: this is a fork of <https://github.com/oalders/diff-lockfiles>. It diffs `package-lock.json`
(npm), `bun.lock` (Bun), `pnpm-lock.yaml` (pnpm), `yarn.lock` (Yarn classic v1
and Berry v2+), and `aube-lock.yaml` (aube) files.

[![npm](https://img.shields.io/npm/v/diff-lockfiles)](https://www.npmjs.com/package/diff-lockfiles)

## Supported lockfiles

- **`package-lock.json`** (npm lockfile v2/v3). Keys are `node_modules/...`
  paths.
- **`bun.lock`** (Bun 1.2.0+ text lockfile, JSONC). Keys are bare package
  names (e.g. `express`), which makes for more readable diffs than the
  `node_modules/...` form.
- **`pnpm-lock.yaml`** (pnpm v9/10/11). Keys are `name@version` (the version
  lives in the key). `importers["."]` supplies the direct-dependency set for
  `--shallow`.
- **`yarn.lock`** (Yarn classic v1 and Berry v2/v3/v4). Keys are
  `name@version` reconstructed from each entry's descriptors and resolved
  `version` field. ⚠️ yarn.lock carries no root-manifest info, so `--shallow`
  has no effect on yarn diffs — every package is shown and classified as
  `transitive` (see [Limitations](#limitations)).
- **`aube-lock.yaml`** (aube). Byte-identical to the pnpm v9 format; branch
  lockfiles (`aube-lock.<branch>.yaml`) are matched too.

Changed lockfiles are discovered anywhere in the repo (nested workspace paths
included); any file in the diff that isn't a recognized lockfile is ignored.
When more than one lockfile changes in a run, each is reported as its own
labeled section (table title row, JSON key, `── file ──` divider, or markdown
`##` heading) — see the format examples below.

All formats produce the same enriched output in all four renderers: every
change carries its **kind** (added/removed/upgrade/downgrade/changed), the
**bump** level (major/minor/patch) when it's a semver move, and its **scope**
(direct vs transitive dependency). The legacy binary `bun.lockb` and the old
`package-lock.json` v1 (`dependencies` map, no `packages`) are **not** supported.

## Example

Install `diff-lockfiles` globally:

```sh
npm install -g diff-lockfiles
```

Try it out:

```sh
diff-lockfiles --color origin/main dependabot/branch

diff-lockfiles --color HEAD~1 HEAD
```

## Usage

```text
diff-lockfiles --help
Usage:  diff-lockfiles [options] <from> <to>

diff all changed lockfiles (npm, bun, pnpm, yarn, aube) in the repo

Options:
  -V, --version            output the version number
  -f, --format <format>    changes the output format (table|json|markdown|text) (default: "table")
  -m, --max-buffer <size>  maximum read buffer size (bytes) (default: 10240000)
  -c, --color              colorizes certain output formats (default: false)
  -s, --shallow            only include direct dependencies of the project (default: false)
  -h, --help               display help for command
```

### `--format=table` (default)

```text
$ diff-lockfiles HEAD~1 HEAD
╔═════════════════════╤═════════╤═════════╤═════════╗
║ package-lock.json   │         │         │         ║
╟─────────────────────┼─────────┼─────────┼─────────╢
║ package             │ old     │ new     │ change  ║
╟─────────────────────┼─────────┼─────────┼─────────╢
║ node_modules/lodash │ 4.17.20 │ 4.17.21 │ ↑ patch ║
╟─────────────────────┼─────────┼─────────┼─────────╢
║ node_modules/dedent │ —       │ 1.5.1   │ added   ║
╚═════════════════════╧═════════╧═════════╧═════════╝
```

The first row labels the lockfile. When more than one lockfile changes in a
run, each gets its own boxed table (and the other formats label each section
similarly — see below). With `--color`, the bumped version segment is bolded
and old/new cells are coloured by direction (red old / green new for upgrades,
the reverse for downgrades).

### `--format=json`

`diff-lockfiles --format json HEAD~1 HEAD`

Output is a single JSON object keyed by lockfile path, so a multi-lockfile run
is still one valid, `jq`-friendly document. Each package maps to a full change
object: a classified `kind`, structured `oldVersion`/`newVersion` (with semver
components and optional `prerelease`/`build`), the semver magnitude `bump` (or
`null`), and the dependency `scope`.

```json
{
  "package-lock.json": {
    "node_modules/lodash": {
      "kind": "upgrade",
      "oldVersion": {
        "scheme": "semver",
        "raw": "4.17.20",
        "major": 4,
        "minor": 17,
        "patch": 20
      },
      "newVersion": {
        "scheme": "semver",
        "raw": "4.17.21",
        "major": 4,
        "minor": 17,
        "patch": 21
      },
      "bump": "patch",
      "scope": "direct"
    },
    "node_modules/dedent": {
      "kind": "added",
      "oldVersion": null,
      "newVersion": {
        "scheme": "semver",
        "raw": "1.5.1",
        "major": 1,
        "minor": 5,
        "patch": 1
      },
      "bump": null,
      "scope": "transitive"
    }
  }
}
```

### `--format=text`

```text
$ diff-lockfiles --format text HEAD~1 HEAD
── package-lock.json ──
node_modules/lodash 4.17.20 -> 4.17.21 patch · direct
node_modules/dedent added 1.5.1 · transitive
```

Each lockfile is introduced by a `── <lockfile> ──` divider. With `--color`,
upgrades render green and downgrades red, and the bumped version segment
(everything from the changed component onward) is bolded.

### `--format=markdown`

```shell
$ diff-lockfiles --format markdown HEAD~1 HEAD
```

```markdown
## package-lock.json

| Package             | Old       | New       | Change        | Scope      |
| ------------------- | --------- | --------- | ------------- | ---------- |
| node_modules/lodash | `4.17.20` | `4.17.21` | patch upgrade | direct     |
| node_modules/dedent | `—`       | `1.5.1`   | added         | transitive |
```

## Limitations

- **pnpm & yarn upgrades render as remove + add:** these lockfiles key packages
  by `name@version`, so bumping a version looks like the old key removed and a
  new key added, rather than a single `upgrade`. npm and bun key by a stable
  path or bare name, so they upgrade normally.
- **yarn.lock + `--shallow`:** yarn.lock contains only resolved entries — the
  root manifest lives in `package.json`. Since `diff-lockfiles` reads only
  lockfiles, `--shallow` cannot filter yarn output; all yarn packages are shown
  and classified as `transitive`.
- **pnpm peer variants:** pnpm's `snapshots:` map can carry peer-context
  variants of the same version (`pkg@1.0.0(react@16)` vs `pkg@1.0.0(react@17)`).
  This tool reads `packages:` only, so such variants collapse to a single
  `name@version` key.

## Testing

```bash
npm test
```
