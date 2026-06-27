import { diff } from '../src/index.js';
import { change } from './helpers.js';

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
        express: { version: '4.18.0' }, // unchanged -> dropped
        lodash: { version: '4.17.21' }, // downgrade
      },
    };
    const newLock = {
      packages: {
        express: { version: '4.18.0' },
        lodash: { version: '4.17.20' },
      },
    };
    expect(diff(oldLock, newLock, false)).toEqual({ lodash: change('4.17.21', '4.17.20') });
  });

  it('does not throw on non-semver specifiers (classifies as changed)', () => {
    const oldLock = { packages: { foo: { version: 'git+ssh://host/a' } } };
    const newLock = { packages: { foo: { version: 'git+ssh://host/b' } } };
    expect(diff(oldLock, newLock, false)).toEqual({
      foo: change('git+ssh://host/a', 'git+ssh://host/b'),
    });
  });
});

describe('diff (shallow via directDependencyKeys)', () => {
  it('only includes packages whose key is in directDependencyKeys', () => {
    const oldLock = {
      packages: {
        express: { version: '4.18.0' },
        accepts: { version: '1.3.7' }, // transitive; not in direct set
      },
      directDependencyKeys: ['express'],
    };
    const newLock = {
      packages: {
        express: { version: '4.18.2' },
        accepts: { version: '1.3.8' },
      },
      directDependencyKeys: ['express'],
    };
    expect(diff(oldLock, newLock, true)).toEqual({ express: change('4.18.0', '4.18.2', 'direct') });
  });
});
