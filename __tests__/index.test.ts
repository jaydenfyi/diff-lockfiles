import { diff } from '../src/index.js';
import { change, pkg } from './helpers.js';

describe('diff', () => {
  it('returns an empty object when given two empty objects', () => {
    const oldLock = { packages: {} };
    const newLock = { packages: {} };
    const changes = diff(oldLock, newLock, false);
    expect(changes).toEqual({});
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
    expect(diff(oldLock, newLock, false)).toEqual({ lodash: change('4.17.21', '4.17.20') });
  });

  it('does not throw on non-semver specifiers (classifies as changed)', () => {
    const oldLock = { packages: { foo: pkg('foo', 'git+ssh://host/a') } };
    const newLock = { packages: { foo: pkg('foo', 'git+ssh://host/b') } };
    expect(diff(oldLock, newLock, false)).toEqual({
      foo: change('git+ssh://host/a', 'git+ssh://host/b'),
    });
  });
});

describe('diff (shallow via directDependencyInfoAvailable)', () => {
  it('only includes direct packages when shallow and direct info is available', () => {
    const oldLock = {
      packages: {
        express: pkg('express', '4.18.0', 'express', true),
        accepts: pkg('accepts', '1.3.7'), // transitive; filtered out
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
    expect(diff(oldLock, newLock, true)).toEqual({ express: change('4.18.0', '4.18.2', 'direct') });
  });
});
