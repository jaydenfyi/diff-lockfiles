# diff-lockfiles

Note: this is a fork of <https://github.com/mxweaver/lock-diff>, but it
operates on Git commit ranges rather than on files. It diffs both
`package-lock.json` and `bun.lock` files.

[![npm](https://img.shields.io/npm/v/diff-lockfiles)](https://www.npmjs.com/package/diff-lockfiles)

## Supported lockfiles

- **`package-lock.json`** (npm lockfile v2/v3). Keys are `node_modules/...`
  paths.
- **`bun.lock`** (Bun 1.2.0+ text lockfile, JSONC). Keys are bare package
  names (e.g. `express`), which makes for more readable diffs than the
  `node_modules/...` form.

Both formats produce the same enriched output in all four renderers: every
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

```ssh
diff-lockfiles --color origin/main dependabot/branch

diff-lockfiles --color HEAD~1 HEAD
```

## Usage

```text
diff-lockfiles --help
Usage:  diff-lockfiles [options] <from> <to>

diff all changed package-lock.json and bun.lock files in repo

Options:
  -V, --version          output the version number
  -f, --format <format>  changes the output format (default: "table")
  -m, --max-buffer       maximum read buffer size
  -c, --color            colorizes certain output formats (default: false)
  -s, --shallow          only include direct dependencies of the project (default: false)
  -h, --help             display help for command
```

### `--format=table` (default)

```text
$ diff-lockfiles HEAD~1 HEAD
╔════════════════════════════╤════════╤════════╤═════════╗
║ package-lock.json          │        │        │         ║
╟────────────────────────────┼────────┼────────┼─────────╢
║ package                    │ old    │ new    │ change  ║
╟────────────────────────────┼────────┼────────┼─────────╢
║ node_modules/@jest/core    │ 29.6.2 │ 29.6.3 │ ↑ patch ║
╟────────────────────────────┼────────┼────────┼─────────╢
║ node_modules/jest          │ 29.6.2 │ 29.6.3 │ ↑ patch ║
╟────────────────────────────┼────────┼────────┼─────────╢
║ node_modules/dedent        │ 1.3.0  │ 1.5.1  │ ↑ minor ║
╟────────────────────────────┼────────┼────────┼─────────╢
║ node_modules/resolve       │ 1.22.2 │ 1.22.4 │ ↑ patch ║
╟────────────────────────────┼────────┼────────┼─────────╢
║ node_modules/pretty-format │ —      │ 29.6.3 │ added   ║
╚════════════════════════════╧════════╧════════╧═════════╝
```

With `--color`, the bumped version segment is bolded and old/new cells are
coloured by direction (red old / green new for upgrades, the reverse for
downgrades).

### `--format=json`

`diff-lockfiles --format json HEAD~1 HEAD`

Each package maps to a full change object: a classified `kind`, structured
`oldVersion`/`newVersion` (with semver components and optional `prerelease`/
`build`), the semver magnitude `bump` (or `null`), and the dependency `scope`.

```json
{
  "node_modules/dedent": {
    "kind": "upgrade",
    "oldVersion": {
      "scheme": "semver",
      "raw": "1.3.0",
      "major": 1,
      "minor": 3,
      "patch": 0
    },
    "newVersion": {
      "scheme": "semver",
      "raw": "1.5.1",
      "major": 1,
      "minor": 5,
      "patch": 1
    },
    "bump": "minor",
    "scope": "transitive"
  },
  "node_modules/pretty-format": {
    "kind": "added",
    "oldVersion": null,
    "newVersion": {
      "scheme": "semver",
      "raw": "29.6.3",
      "major": 29,
      "minor": 6,
      "patch": 3
    },
    "bump": null,
    "scope": "transitive"
  }
}
```

### `--format=text`

```text
$ diff-lockfiles --format text HEAD~1 HEAD
node_modules/@jest/core 29.6.2 -> 29.6.3 patch · transitive
node_modules/jest 29.6.2 -> 29.6.3 patch · direct
node_modules/dedent 1.3.0 -> 1.5.1 minor · transitive
node_modules/resolve 1.22.2 -> 1.22.4 patch · transitive
node_modules/pretty-format added 29.6.3 · transitive
```

With `--color`, upgrades render green and downgrades red, and the bumped
version segment (everything from the changed component onward) is bolded.

### `--format=markdown`

```shell
$ diff-lockfiles --format markdown HEAD~1 HEAD
```

| Package                    | Old      | New      | Change        | Scope      |
| -------------------------- | -------- | -------- | ------------- | ---------- |
| node_modules/@jest/core    | `29.6.2` | `29.6.3` | patch upgrade | transitive |
| node_modules/jest          | `29.6.2` | `29.6.3` | patch upgrade | direct     |
| node_modules/dedent        | `1.3.0`  | `1.5.1`  | minor upgrade | transitive |
| node_modules/resolve       | `1.22.2` | `1.22.4` | patch upgrade | transitive |
| node_modules/pretty-format | `—`      | `29.6.3` | added         | transitive |

## Testing

```bash
npm test
```
