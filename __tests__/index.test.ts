import { diff } from '../src/index.js';
import { changeEntry, pkg } from './helpers.js';

describe('diff', () => {
  it('returns an empty array when given two empty objects', () => {
    expect(diff({ packages: {} }, { packages: {} }, false)).toEqual([]);
  });

  it('classifies each change and drops unchanged packages', () => {
    const oldLock = {
      packages: {
        express: pkg('express', '4.18.0'), // unchanged -> dropped
        lodash: pkg('lodash', '4.17.21'), // downgrade
      },
    };
    const newLock = {
      packages: {
        express: pkg('express', '4.18.0'),
        lodash: pkg('lodash', '4.17.20'),
      },
    };
    expect(diff(oldLock, newLock, false)).toEqual([changeEntry('lodash', '4.17.21', '4.17.20')]);
  });

  it('does not throw on non-semver specifiers (classifies as changed)', () => {
    const oldLock = { packages: { foo: pkg('foo', 'git+ssh://host/a') } };
    const newLock = { packages: { foo: pkg('foo', 'git+ssh://host/b') } };
    expect(diff(oldLock, newLock, false)).toEqual([
      changeEntry('foo', 'git+ssh://host/a', 'git+ssh://host/b'),
    ]);
  });
});

describe('diff (shallow via directDependencyInfoAvailable)', () => {
  it('only includes packages flagged direct when shallow and direct info is available', () => {
    const oldLock = {
      packages: {
        express: pkg('express', '4.18.0', 'express', true),
        accepts: pkg('accepts', '1.3.7'), // transitive; not included
      },
      directDependencyInfoAvailable: true,
    };
    const newLock = {
      packages: {
        express: pkg('express', '4.18.2', 'express', true),
        accepts: pkg('accepts', '1.3.8'),
      },
      directDependencyInfoAvailable: true,
    };
    expect(diff(oldLock, newLock, true)).toEqual([
      changeEntry('express', '4.18.0', '4.18.2', {
        oldSourceKey: 'express',
        newSourceKey: 'express',
        scope: 'direct',
      }),
    ]);
  });
});
