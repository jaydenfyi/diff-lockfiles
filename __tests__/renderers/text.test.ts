import { textRenderer } from '../../src/renderers/text.js';
import { createColor } from '../../src/colors.js';
import { changeEntry, lockfiles } from '../helpers.js';
import type { LockfileDiffs, RenderOptions } from '../../src/renderers/types.js';

const noColor: RenderOptions = { color: false };

describe('textRenderer', () => {
  it('renders a header divider per lockfile, then one line per change', () => {
    const out = textRenderer.render(
      lockfiles({
        'apps/api/bun.lock': { lodash: [null, '4.17.21'] }, // added
        'package-lock.json': { chalk: ['4.1.0', '5.0.0'] }, // upgrade
      }),
      noColor,
    );
    expect(out).toBe(
      [
        '── apps/api/bun.lock ──',
        'lodash added 4.17.21 · transitive',
        '',
        '── package-lock.json ──',
        'chalk 4.1.0 -> 5.0.0 major · transitive',
      ].join('\n'),
    );
  });

  it('returns an empty string for an empty run', () => {
    expect(textRenderer.render([], noColor)).toBe('');
  });

  it('renders a non-semver change plainly with no colour (and no throw)', () => {
    const out = textRenderer.render(lockfiles({ 'a.lock': { foo: ['git+ssh://host/a', 'git+ssh://host/b'] } }), noColor);
    expect(out).toBe('── a.lock ──\nfoo git+ssh://host/a -> git+ssh://host/b · transitive');
  });

  it('paints upgrades green / downgrades red when colour is enabled', () => {
    const out = textRenderer.render(lockfiles({ 'a.lock': { up: ['1.0.0', '2.0.0'], down: ['2.0.0', '1.0.0'] } }), { color: true });
    const color = createColor(true);
    expect(out).toContain(color.green(`${color.bold('1.0.0')} -> ${color.bold('2.0.0')} major`));
    expect(out).toContain(color.red(`${color.bold('2.0.0')} -> ${color.bold('1.0.0')} major`));
  });

  it('emits no ANSI codes when color=false', () => {
    const out = textRenderer.render(lockfiles({ 'a.lock': { lodash: [null, '1.0.0'] } }), noColor);
    expect(out).not.toContain('\x1b');
  });

  it('includes prerelease + build metadata in highlighted versions', () => {
    // No colour: the suffix text (`-alpha+sha`) must appear verbatim.
    const plain = textRenderer.render(
      lockfiles({ 'a.lock': { pkg: ['1.2.3-alpha+sha', '1.3.0'] } }), // minor bump
      noColor,
    );
    expect(plain).toContain('1.2.3-alpha+sha -> 1.3.0 minor · transitive');

    // With colour, a major bump bolds the entire version incl. its prerelease
    // + build suffix — pinning that the suffix rides along inside the bolded
    // region rather than being dropped or stranded outside it.
    const colored = textRenderer.render(
      lockfiles({ 'a.lock': { pkg: ['1.0.0-beta+build', '2.0.0'] } }),
      { color: true },
    );
    const color = createColor(true);
    expect(colored).toContain(color.bold('1.0.0-beta+build'));
    expect(colored).toContain(color.bold('2.0.0'));
  });

  it('adds source-key disambiguators only for duplicate rendered rows', () => {
    const data: LockfileDiffs = [
      {
        lockfile: 'package-lock.json',
        changes: [
          changeEntry('lodash', '4.17.21', null, { oldSourceKey: 'node_modules/foo/node_modules/lodash' }),
          changeEntry('lodash', '4.17.21', null, { oldSourceKey: 'node_modules/bar/node_modules/lodash' }),
        ],
      },
    ];
    const out = textRenderer.render(data, noColor);
    // Both rows share name+kind+version, so each is disambiguated with its source key.
    expect(out).toContain('lodash (node_modules/foo/node_modules/lodash) removed 4.17.21');
    expect(out).toContain('lodash (node_modules/bar/node_modules/lodash) removed 4.17.21');
  });

  it('omits disambiguators for distinct rows', () => {
    const out = textRenderer.render(
      lockfiles({ 'a.lock': { lodash: ['4.17.20', '4.17.21'] } }),
      noColor,
    );
    expect(out).toContain('lodash 4.17.20 -> 4.17.21 patch · transitive');
    expect(out).not.toContain('(');
  });
});
