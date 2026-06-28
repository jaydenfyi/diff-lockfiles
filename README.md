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
  lives in the key).
- **`yarn.lock`** (Yarn classic v1 and Berry v2/v3/v4). Keys are
  `name@version` reconstructed from each entry's descriptors and resolved
  `version` field.
- **`aube-lock.yaml`** (aube). Byte-identical to the pnpm v9 format; branch
  lockfiles (`aube-lock.<branch>.yaml`) are matched too.

Changed lockfiles are discovered anywhere in the repo (nested workspace paths
included); any file in the diff that isn't a recognized lockfile is ignored.
When more than one lockfile changes in a run, each is reported as its own
labeled section (table title row, JSON key, `── file ──` divider, or markdown
`##` heading) — see the format examples below.

All formats produce the same enriched output in all four renderers: every
change carries its **kind** (added/removed/upgrade/downgrade/changed) and the
**bump** level (major/minor/patch) when it's a semver move. The legacy binary
`bun.lockb` and the old `package-lock.json` v1 (`dependencies` map, no
`packages`) are **not** supported.

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
║ lodash              │ 4.17.20 │ 4.17.21 │ ↑ patch ║
╟─────────────────────┼─────────┼─────────┼─────────╢
║ dedent              │ —       │ 1.5.1   │ added   ║
╚═════════════════════╧═════════╧═════════╧═════════╝
```

The first row labels the lockfile. Package names are the bare name (`lodash`,
not the lockfile's internal `node_modules/lodash` key), consistent across all
formats. When more than one lockfile changes in a run, each gets its own boxed
table (and the other formats label each section similarly — see below). With
`--color`, the bumped version segment is bolded and old/new cells are coloured
by direction (red old / green new for upgrades, the reverse for downgrades).

### `--format=json`

`diff-lockfiles --format json HEAD~1 HEAD`

Output is a single JSON object keyed by lockfile path, then by **bare package
name**, with each package mapping to an **array** of change objects: a package
name can resolve to multiple versions, so the value is always an array even
when there's only one change. Each change carries a classified `kind`,
structured `oldVersion`/`newVersion` (with semver components and optional
`prerelease`/`build`), the semver magnitude `bump` (or `null`), and the original
lockfile `oldSourceKey`/`newSourceKey` for provenance.

```json
{
	"package-lock.json": {
		"lodash": [
			{
				"name": "lodash",
				"oldSourceKey": "node_modules/lodash",
				"newSourceKey": "node_modules/lodash",
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
				"bump": "patch"
			}
		],
		"dedent": [
			{
				"name": "dedent",
				"oldSourceKey": null,
				"newSourceKey": "node_modules/dedent",
				"kind": "added",
				"oldVersion": null,
				"newVersion": {
					"scheme": "semver",
					"raw": "1.5.1",
					"major": 1,
					"minor": 5,
					"patch": 1
				},
				"bump": null
			}
		]
	}
}
```

When a package name appears at multiple resolved versions (e.g. across a
workspace), it produces multiple entries in its array, each carrying its own
`sourceKey` so the versions stay distinct.

### `--format=text`

```text
$ diff-lockfiles --format text HEAD~1 HEAD
── package-lock.json ──
lodash 4.17.20 -> 4.17.21 ↑ patch
dedent added 1.5.1
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

| Package | Old       | New       | Change        |
| ------- | --------- | --------- | ------------- |
| lodash  | `4.17.20` | `4.17.21` | patch upgrade |
| dedent  | `—`       | `1.5.1`   | added         |
```

## Programmatic API

`diff-lockfiles` is also a library. Configure a diff engine once with
`createDiffLockfiles`, then parse, diff, and render. The engine is pure (no I/O);
git orchestration lives at the `diff-lockfiles/git` subpath.

```ts
import { createDiffLockfiles } from 'diff-lockfiles';
import { npm, bun, pnpm, yarn, aube } from 'diff-lockfiles/formats';
import { markdown } from 'diff-lockfiles/renderers';
import { diffGitRefs } from 'diff-lockfiles/git';

const dlf = createDiffLockfiles({
	formats: [npm(), bun(), pnpm(), yarn(), aube()], // omit for all 5 defaults
});

// Diff every changed lockfile between two git refs (returns data, no printing):
const diffs = await diffGitRefs(dlf, 'HEAD~1', 'HEAD', { cwd: '/repo' });
console.log(markdown().render(diffs, { color: false }));

// Or diff file contents directly (no git); null = that side is absent:
const changes = dlf.diffFile('package-lock.json', oldContent, newContent);
```

### Instance methods

| Method                                           | Notes                                                                                                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dlf.diffFile(filename, oldContent, newContent)` | One-call diff when you have a file path. Detects the format, parses both sides, diffs. `null` for a side = absent (added/removed). `[]` if the filename is not a known lockfile. |
| `dlf.diff(oldLock, newLock)`                     | Pure escape hatch over two already-parsed `NormalizedLockfile`s.                                                                                                                 |

There is no `dlf.parse` — to parse a known format, call the adapter directly:

```ts
import { npm } from 'diff-lockfiles/formats';
const lock = npm().parse(content); // content only — the filename was never used
```

### Plugins

Built-in formats live at `diff-lockfiles/formats`; built-in renderers at
`diff-lockfiles/renderers`. Each is a factory function. Custom ones have the
same shape:

```ts
import type { LockfileAdapter } from 'diff-lockfiles/formats';
import type { Renderer } from 'diff-lockfiles/renderers';

// Custom lockfile format — register it on the instance:
const mine = (): LockfileAdapter => ({
	matches: (f) => f.endsWith('my.lock'),
	parse: (content) => myParse(content),
});
const dlf = createDiffLockfiles({ formats: [mine()] });

// Custom renderer — just import and call it (no registration):
const csv = (): Renderer => ({
	render(lockfiles, { color }) {
		/* return a string */
	},
});
console.log(csv().render(diffs, { color: false }));
```

To get all built-in formats plus a custom one, spread the sentinel:

```ts
import { defaultFormats } from 'diff-lockfiles/formats';
const dlf = createDiffLockfiles({ formats: [...defaultFormats, mine()] });
```

Renderers are called directly — there is no central render registry, so a custom
renderer is just a function you import and call.

### Exports

| Subpath                    | Exports                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `diff-lockfiles`           | `createDiffLockfiles`, `diff`, `parseVersion`, instance + core types                    |
| `diff-lockfiles/formats`   | `npm`/`bun`/`pnpm`/`yarn`/`aube` factories, `defaultFormats`, `LockfileAdapter` + types |
| `diff-lockfiles/renderers` | `json`/`text`/`table`/`markdown` factories, `Renderer` + types                          |
| `diff-lockfiles/git`       | `diffGitRefs`, `diffChangedLockfiles`, `createGitSource`, `LockfileSource`              |

> The git-driven orchestrator is intentionally not on the engine instance — the
> engine stays pure. For programmatic repo diffs, use `diffGitRefs` from
> `diff-lockfiles/git`. To diff between arbitrary sources, pass a custom
> `LockfileSource` to `diffChangedLockfiles`.

### Breaking changes (vs the prior 0.0.0 API)

- `parseNpmLockfile` / `parseBunLockfile` / … raw adapter objects → use `npm().parse(content)` (the `npm()` factory from `diff-lockfiles/formats`). `.parse` lost its unused `filename` arg; there is no `dlf.parse`.
- `print(lockfiles, options)` → use `console.log(markdown().render(diffs, { color }))` (import the renderer from `diff-lockfiles/renderers`).
- `diffChangedLockfiles` now returns `LockfileDiffs` instead of printing; pass a `DiffLockfiles` instance as the first arg.

## Limitations

- **Duplicate resolved versions are reported conservatively:** when a package
  name appears at multiple resolved versions (e.g. across a workspace),
  unchanged same-name/same-version entries are cancelled first. A single
  remaining old/new pair is shown as one upgrade/downgrade; an ambiguous
  many-to-many replacement falls back to added/removed rows. Provenance
  (`node_modules/...` path or `name@version` key) is shown only when two
  rendered rows would otherwise be identical.
- **pnpm peer variants:** pnpm's `snapshots:` map can carry peer-context
  variants of the same version (`pkg@1.0.0(react@16)` vs `pkg@1.0.0(react@17)`).
  This tool reads `packages:` only, so such variants collapse to a single
  `name@version` key.

## Testing

```bash
npm test
```
