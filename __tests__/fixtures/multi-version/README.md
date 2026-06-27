# Multi-version lockfile fixtures

These are **real, package-manager-generated** lockfiles committed as static
files so the test suite can exercise genuine multi-version (duplicate/
triplicate) package resolution offline and deterministically.

## Why a workspace?

A single-project install can **never** produce duplicate same-name versions:
you can't declare two versions of one direct dependency, and peer dependencies
dedupe to one resolved version. The only way to force genuine multi-version
resolution is a **workspace (monorepo)** whose members pin different versions
of the same package.

Each fixture here is a workspace with members `apps/a`, `apps/b`, `apps/c`,
each depending on a different exact version of `left-pad`.

## Snapshots

| Snapshot                        | Apps pin                                      | Proves                                                                                          |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `pair-old` / `pair-new`         | `{1.0.2,1.1.3,1.2.0}` → `{1.1.3,1.2.0,1.3.0}` | cancellation of unchanged same-version entries **plus** one clean 1:1 upgrade (`1.0.2 → 1.3.0`) |
| `fallback-old` / `fallback-new` | `{1.0.2,1.1.3}` → `{1.2.0,1.3.0}`             | ambiguous many-to-many replacement → 2 removed + 2 added rows                                   |

Versions are restricted to those `left-pad` has actually published (latest is
`1.3.0`) so the fixtures regenerate reproducibly.

## Regenerating

```sh
node __tests__/fixtures/multi-version/generate.mjs
```

The script is **network-dependent** (it runs `npm`/`yarn`/`pnpm`/`bun install`)
and must **NOT** run during `npm test`. Regenerate only when a lockfile format
changes or `left-pad` versions drift. It also copies the pnpm snapshots to
`aube/` as `aube-lock.yaml` (aube reuses the pnpm format).

Requires the four package managers on `PATH`: npm, yarn (berry), pnpm, bun.

## Per-manager resolution shape (empirically verified)

- **npm** — nested `node_modules` paths: `node_modules/left-pad`,
  `apps/b/node_modules/left-pad`, `apps/c/node_modules/left-pad`.
- **pnpm / aube** — `name@version` keys: `left-pad@1.0.2`, `left-pad@1.1.3`, …
- **yarn (berry)** — separate entries, each with its own `version:` field.
- **bun** — hoisted primary `left-pad` plus namespaced overrides `b/left-pad`,
  `c/left-pad`. The bare name is read from the package array's `name@version`
  element, **not** the namespaced map key.
