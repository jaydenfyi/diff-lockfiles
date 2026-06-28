# diff-lockfiles

[![npm](https://img.shields.io/npm/v/diff-lockfiles)](https://www.npmjs.com/package/diff-lockfiles)

Diff package-manager lockfiles across git refs. Built for PR review and CI
output, it highlights package additions, removals, upgrades, downgrades, and
semver bump size.

## Why use it?

- supports npm, Bun, pnpm, Yarn classic/Berry, and aube lockfiles
- finds changed lockfiles anywhere in the repo, including nested workspaces
- classifies each change as `added`, `removed`, `upgrade`, `downgrade`, or
  `changed`
- detects semver bump size for upgrades and downgrades: `major`, `minor`, or
  `patch`
- displays readable package names, with source keys kept only when needed for
  disambiguation
- renders table, Markdown, text, or structured JSON output
- exposes a library API for custom parsers, renderers, and git sources

## Supported lockfiles

- **`package-lock.json`** (npm lockfile v2/v3). Keys are `node_modules/...`
  paths.
- **`bun.lock`** (Bun 1.2.0+ text lockfile, JSONC). Package names are read from
  each resolved package entry.
- **`pnpm-lock.yaml`** (pnpm v9/10/11). Keys are `name@version` (the version
  lives in the key).
- **`yarn.lock`** (Yarn classic v1 and Berry v2/v3/v4). Keys are
  `name@version` reconstructed from each entry's descriptors and resolved
  `version` field.
- **`aube-lock.yaml`** (aube). Byte-identical to the pnpm v9 format; branch
  lockfiles (`aube-lock.<branch>.yaml`) are matched too.

Recognized lockfile paths are processed directly from the git diff. If multiple
lockfiles change, each renderer labels them separately.

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
  --check                  exit 0 when a supported lockfile changed, 1 otherwise
  -h, --help               display help for command
```

By default, `diff-lockfiles` exits `0` when the command runs successfully, even
when the range contains no supported lockfile changes. Add `--check` in CI to
make the exit code reflect whether a supported lockfile path changed: `0` when
one did, `1` when none did, and `>1` for command errors.

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

The first row labels the lockfile. Package names use the same readable label
across every supported format. When more than one lockfile changes in a run,
each gets its own boxed table (and the other formats label each section
similarly — see below). With
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

## GitHub Actions PR comment

Use the Markdown renderer to post a sticky lockfile summary when the latest PR
commit changes a supported lockfile:

```yaml
name: Lockfile diff

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  comment:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Render lockfile diff
        id: lockfile-diff
        env:
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: |
          base_sha="$(git rev-parse "$HEAD_SHA^")"

          if ! diff_output="$(npx --yes diff-lockfiles --check --format markdown "$base_sha" "$HEAD_SHA")"; then
            echo 'should_comment=false' >> "$GITHUB_OUTPUT"
            exit 0
          fi

          {
            echo 'should_comment=true'
            echo 'body<<LOCKFILE_DIFF_COMMENT'
            echo '## Lockfile changes'
            echo
            if [ -n "$diff_output" ]; then
              echo "$diff_output"
            else
              echo 'A lockfile changed, but no package version changes were detected.'
            fi
            echo 'LOCKFILE_DIFF_COMMENT'
          } >> "$GITHUB_OUTPUT"

      - name: Create or update PR comment
        if: steps.lockfile-diff.outputs.should_comment == 'true'
        uses: actions/github-script@v7
        env:
          BODY: ${{ steps.lockfile-diff.outputs.body }}
        with:
          script: |
            const marker = '<!-- diff-lockfiles -->';
            const body = `${marker}\n${process.env.BODY}`;
            const { owner, repo } = context.repo;
            const issue_number = context.issue.number;

            const comments = await github.paginate(github.rest.issues.listComments, {
              owner,
              repo,
              issue_number,
            });

            const existing = comments.find((comment) =>
              comment.user.type === 'Bot' && comment.body?.includes(marker),
            );

            if (existing) {
              await github.rest.issues.updateComment({
                owner,
                repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner,
                repo,
                issue_number,
                body,
              });
            }
```

The workflow compares the latest PR commit (`HEAD^..HEAD`). `--check` makes the
CLI exit code gate the comment, while `--format markdown` makes the same command
produce the comment body. The marker keeps one comment updated instead of adding
a new comment on every matching push. For forked pull requests, make sure your
repository's token permissions allow PR comments before enabling this workflow.

## Programmatic API

`diff-lockfiles` is also a library. Import the pre-built `diffLockfiles` engine
(all five built-in parsers registered) and call it directly, or use
`createDiffLockfiles` to configure your own parser set. The engine is pure
(no I/O); git orchestration lives at the `diff-lockfiles/git` subpath.

```ts
import { diffLockfiles } from 'diff-lockfiles';
import { markdown } from 'diff-lockfiles/renderers';
import { diffGitRefs } from 'diff-lockfiles/git';

// Diff every changed lockfile between two git refs (returns data, no printing):
const result = await diffGitRefs(diffLockfiles, 'HEAD~1', 'HEAD', { cwd: '/repo' });
console.log(markdown().render(result.lockfiles, { color: false }));

// Or diff file contents directly (no git); null = that side is absent:
const changes = diffLockfiles.diffFile('package-lock.json', oldContent, newContent);
```

`diffGitRefs` returns both the lockfile paths touched by the git range and the
package-level diffs ready for rendering:

```ts
result.changedLockfiles; // recognized lockfile paths in the git diff
result.lockfiles; // lockfiles with package-level changes
```

For a custom parser set, pass the exact parsers you want, or spread
`defaultParsers` to include the built-ins:

```ts
import { createDiffLockfiles } from 'diff-lockfiles';
import { npm, bun, defaultParsers } from 'diff-lockfiles/parsers';

const npmAndBun = createDiffLockfiles({ parsers: [npm(), bun()] });
const all = createDiffLockfiles({ parsers: [...defaultParsers] }); // all five
```

### Instance methods

| Method                                              | Notes                                                                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `engine.matches(filename)`                          | Whether any registered parser handles the path.                                                                                                                                                   |
| `engine.diffFile(filename, oldContent, newContent)` | One-call diff when you have a file path. Detects the parser (from the path), parses both sides, diffs. `null` for a side = absent (added/removed). Recognized lockfiles return their changes; other paths return `[]`. |
| `engine.diff(oldLock, newLock)`                     | Pure escape hatch over two already-parsed `NormalizedLockfile`s.                                                                                                                                 |

To parse a known format, call its parser directly:

```ts
import { npm } from 'diff-lockfiles/parsers';
const lock = npm().parse(content);
```

### Plugins

Built-in parsers live at `diff-lockfiles/parsers`; built-in renderers at
`diff-lockfiles/renderers`. Each is a factory function. Custom ones have the
same shape:

```ts
import { createDiffLockfiles } from 'diff-lockfiles';
import type { LockfileParser } from 'diff-lockfiles/parsers';
import type { Renderer } from 'diff-lockfiles/renderers';

// Custom lockfile parser — register it on a fresh engine:
const customLockfileParser = (): LockfileParser => ({
	matches: (filename) => filename.endsWith('my.lock'),
	parse: (content) => myParse(content),
});
const customDiffLockfiles = createDiffLockfiles({ parsers: [customLockfileParser()] });

// Custom renderer — just import and call it (no registration):
const csv = (): Renderer => ({
	render(lockfiles, { color }) {
		/* return a string */
	},
});
console.log(csv().render(result.lockfiles, { color: false }));
```

To get all built-in parsers plus a custom one, spread the sentinel:

```ts
import { defaultParsers } from 'diff-lockfiles/parsers';
const diffLockfiles = createDiffLockfiles({
	parsers: [...defaultParsers, customLockfileParser()],
});
```

Renderers are just functions — import and call them directly.

### Exports

| Subpath                    | Exports                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `diff-lockfiles`           | `diffLockfiles` (pre-built, all parsers), `createDiffLockfiles` (factory), `diff`, `parseVersion`, instance + core types |
| `diff-lockfiles/parsers`   | `npm`/`bun`/`pnpm`/`yarn`/`aube` factories, `defaultParsers`, `LockfileParser` + types                                   |
| `diff-lockfiles/renderers` | `json`/`text`/`table`/`markdown` factories, `Renderer` + types                                                           |
| `diff-lockfiles/git`       | `diffGitRefs`, `diffChangedLockfiles`, `createGitSource`, `LockfileSource`, `LockfileDiffResult`                         |

> For programmatic repo diffs, use `diffGitRefs`. To diff between arbitrary
> sources, pass a custom `LockfileSource` to `diffChangedLockfiles`.

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

## Credits

This package is a reworked fork of
[oalders/diff-lockfiles](https://github.com/oalders/diff-lockfiles). The fork
keeps the git-range workflow and expands it with more lockfile formats,
semver-aware output, structured renderers, and a programmatic API.
