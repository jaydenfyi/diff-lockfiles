// This is a fork of <https://github.com/mxweaver/lock-diff>
import chalk from 'chalk';
import semver from 'semver';
import { table } from 'table';
import { markdownTable } from 'markdown-table';

/** A lockfile in the shape diff() consumes: a `packages` map keyed by package path. */
export interface LockfileLike {
  packages: Record<string, { version: string }>;
}

/** Map of package key -> [oldVersion, newVersion]. `null` means added/removed. */
export type Changes = Record<string, [string | null, string | null]>;

export interface PrintOptions {
  format: 'json' | 'table' | 'markdown' | 'text';
  color: boolean;
  title: string;
}

export function diff(
  oldLock: LockfileLike,
  newLock: LockfileLike,
  shallow: boolean,
): Changes {
  const changes: Changes = {};

  function filterPackages(packages: LockfileLike['packages']): [string, { version: string }][] {
    let entries = Object.entries(packages);
    if (shallow) {
      const selfPackage = packages[''];
      const directDeps = new Set(
        (['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const).flatMap(
          (key) => {
            const deps = (selfPackage as Record<string, unknown> | undefined)?.[key] as
              | Record<string, string>
              | undefined;
            return Object.keys(deps ?? {});
          },
        ).map((pkg) => `node_modules/${pkg}`),
      );
      entries = entries.filter(([name]) => directDeps.has(name) || name === '');
    }
    return entries;
  }

  filterPackages(oldLock.packages).forEach(([name, { version }]) => {
    changes[name] = [version, null];
  });

  filterPackages(newLock.packages).forEach(([name, { version }]) => {
    if (changes[name] && changes[name][0]) {
      if (semver.eq(changes[name][0] as string, version)) {
        delete changes[name];
      } else {
        changes[name] = [changes[name][0], version];
      }
    } else {
      changes[name] = [null, version];
    }
  });

  return changes;
}

function printJSON(changes: Changes): void {
  /* eslint-disable no-console */
  console.log(JSON.stringify(changes));
}

function printText(changes: Changes, options: PrintOptions): void {
  /* eslint-disable no-console */
  Object.entries(changes).forEach(([name, [oldVersion, newVersion]]) => {
    if (!oldVersion) {
      if (options.color) {
        console.log(`${name} ${chalk.green('added')}`);
      } else {
        console.log(`${name} added`);
      }
    } else if (!newVersion) {
      if (options.color) {
        console.log(`${name} ${chalk.red('removed')}`);
      } else {
        console.log(`${name} removed`);
      }
    } else if (!semver.eq(oldVersion, newVersion)) {
      if (options.color) {
        const color = semver.gt(oldVersion, newVersion) ? chalk.red : chalk.green;
        console.log(`${name} ${color(`${oldVersion} -> ${newVersion}`)}`);
      } else {
        console.log(`${name} ${oldVersion} -> ${newVersion}`);
      }
    }
  });
  /* eslint-enable no-console */
}

function printTable(changes: Changes, options: PrintOptions): void {
  /* eslint-disable no-console */
  let data: (string | null)[][] = Object.entries(changes).map(
    ([name, [oldVersion, newVersion]]) => [name, oldVersion, newVersion],
  );

  if (options.color) {
    data = data.map(([name, oldVersion, newVersion]) => {
      if (oldVersion && newVersion && semver.valid(oldVersion) && semver.valid(newVersion)) {
        if (semver.lt(oldVersion, newVersion)) {
          oldVersion = chalk.red(oldVersion);
          newVersion = chalk.green(newVersion);
        } else if (semver.gt(oldVersion, newVersion)) {
          oldVersion = chalk.green(oldVersion);
          newVersion = chalk.red(newVersion);
        }
      }
      return [name, oldVersion, newVersion];
    });
  }

  data.unshift(['package', 'old version', 'new version']);
  if (options.title !== '') {
    data.unshift([options.title, '', '']);
  }

  if (options.color) {
    data[0] = data[0].map((heading) => chalk.bold(heading));
  }

  console.log(table(data));
  /* eslint-disable no-console */
}

function printMarkdown(changes: Changes, options: PrintOptions): void {
  /* eslint-disable no-console */
  function formatVersionChange(oldVersion: string | null, newVersion: string | null): string {
    if (!oldVersion) return `**${newVersion}** (added)`;
    if (!newVersion) return `~~${oldVersion}~~ (removed)`;
    if (semver.valid(oldVersion) && semver.valid(newVersion)) {
      if (semver.lt(oldVersion, newVersion)) {
        return `${oldVersion} → **${newVersion}**`;
      } else if (semver.gt(oldVersion, newVersion)) {
        return `**${oldVersion}** → ${newVersion}`;
      }
    }
    return `${oldVersion} → ${newVersion}`;
  }

  const tableData = [
    ['Package', 'Old Version', 'New Version', 'Change'],
    ...Object.entries(changes).map(([name, [oldVersion, newVersion]]) => [
      name,
      oldVersion || '—',
      newVersion || '—',
      formatVersionChange(oldVersion, newVersion),
    ]),
  ];

  if (options.title && options.title !== '') {
    console.log(`## ${options.title}\n`);
  }

  console.log(markdownTable(tableData));
  /* eslint-enable no-console */
}

export function print(changes: Changes, options: PrintOptions): void {
  switch (options.format) {
    case 'json':
      printJSON(changes);
      break;
    case 'table':
      printTable(changes, options);
      break;
    case 'markdown':
      printMarkdown(changes, options);
      break;
    case 'text':
    default:
      printText(changes, options);
      break;
  }
}
