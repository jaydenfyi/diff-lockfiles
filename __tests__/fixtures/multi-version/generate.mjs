// Generates multi-version lockfile fixtures for the diff-lockfiles test suite.
//
// Run manually (NOT during `npm test`): `node __tests__/fixtures/multi-version/generate.mjs`
// Regenerate only when a lockfile format changes or `left-pad` versions drift.
//
// Why a workspace: a single-project install can never produce duplicate same-name
// versions (you can't declare two direct versions; peer deps dedupe). A workspace
// monorepo whose members pin different `left-pad` versions produces genuine
// multi-version resolution in every manager. See README.md in this directory.
import { mkdtemp, mkdir, writeFile, cp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const HERE = new URL('.', import.meta.url).pathname;

// Snapshot definitions. Each snapshot is an array of [app, version] pins.
// Versions restricted to those left-pad has actually published
// (latest is 1.3.0) so fixtures generate reproducibly.
// pair: {1.0.2, 1.1.3, 1.2.0} -> {1.1.3, 1.2.0, 1.3.0}
//   expected diff: cancel 1.1.3/1.2.0; pair 1.0.2 -> 1.3.0 (minor)
// fallback: {1.0.2, 1.1.3} -> {1.2.0, 1.3.0}
//   expected diff: 2 removed + 2 added (ambiguous many-to-many)
const SNAPSHOTS = {
  'pair-old': [['a', '1.0.2'], ['b', '1.1.3'], ['c', '1.2.0']],
  'pair-new': [['a', '1.1.3'], ['b', '1.2.0'], ['c', '1.3.0']],
  'fallback-old': [['a', '1.0.2'], ['b', '1.1.3']],
  'fallback-new': [['a', '1.2.0'], ['b', '1.3.0']],
};

/** Write the workspace package.json files for one snapshot. */
async function writeWorkspace(root, pins) {
  await mkdir(join(root, 'apps'), { recursive: true });
  for (const [app, version] of pins) {
    await mkdir(join(root, 'apps', app), { recursive: true });
    await writeFile(
      join(root, 'apps', app, 'package.json'),
      JSON.stringify({ name: app, version: '1.0.0', dependencies: { 'left-pad': version } }, null, 2),
    );
  }
}

/** Build a fresh root manifest, then write the workspace. Cleans ALL prior state. */
async function setupRoot(root, pins) {
  // Remove everything from a previous snapshot: node_modules, lockfiles, apps.
  for (const junk of ['apps', 'node_modules', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock']) {
    await rm(join(root, junk), { recursive: true, force: true }).catch(() => {});
  }
  // npm/bun/yarn(berry) use the `workspaces` field; pnpm uses pnpm-workspace.yaml.
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ name: 'root', version: '1.0.0', private: true, workspaces: ['apps/*'] }, null, 2),
  );
  await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"\n');
  await writeWorkspace(root, pins);
}

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'ignore', env: { ...process.env, CI: '1' } });

async function main() {
  const root = await mkdtemp(join(tmpdir(), 'diff-lockfiles-fixture-'));
  const managers = ['npm', 'yarn', 'pnpm', 'bun'];
  for (const [snapshot, pins] of Object.entries(SNAPSHOTS)) {
    console.log(`# snapshot: ${snapshot}`);
    for (const manager of managers) {
      await setupRoot(root, pins);
      if (manager === 'npm') run('npm install --no-audit --no-fund --silent', root);
      else if (manager === 'yarn') run('yarn install --silent', root);
      else if (manager === 'pnpm') run('pnpm install --silent', root);
      else if (manager === 'bun') run('bun install --silent', root);

      const dest = join(HERE, manager);
      await mkdir(dest, { recursive: true });
      const file = {
        npm: 'package-lock.json',
        yarn: 'yarn.lock',
        pnpm: 'pnpm-lock.yaml',
        bun: 'bun.lock',
      }[manager];
      await cp(join(root, file), join(dest, `${snapshot}${ext(file)}`));
      const content = await readFile(join(dest, `${snapshot}${ext(file)}`), 'utf8');
      const hits = (content.match(/left-pad/g) || []).length;
      console.log(`  ${manager}: ${hits} left-pad mentions -> ${snapshot}${ext(file)}`);
      if (hits < 3) console.warn(`  ⚠️  ${manager} ${snapshot}: fewer than 3 left-pad mentions!`);
    }
  }

  // aube reuses the pnpm format: copy the pnpm snapshots as aube-lock.yaml.
  const aubeDest = join(HERE, 'aube');
  await mkdir(aubeDest, { recursive: true });
  for (const snapshot of Object.keys(SNAPSHOTS)) {
    await cp(join(HERE, 'pnpm', `${snapshot}.yaml`), join(aubeDest, `${snapshot}.yaml`));
  }
  console.log('# aube: copied pnpm snapshots as aube-lock.yaml');

  await rm(root, { recursive: true, force: true }).catch(() => {});
  console.log('done.');
}

const ext = (file) => (file.endsWith('.json') ? '.json' : file.endsWith('.yaml') ? '.yaml' : '.lock');

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
