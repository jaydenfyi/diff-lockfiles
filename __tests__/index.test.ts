import { diff } from '../src/index.js';

describe('diff', () => {
  it('returns an empty object when given two empty objects', () => {
    const oldLock = { packages: {} };
    const newLock = { packages: {} };
    const changes = diff(oldLock, newLock, false);
    expect(changes).toEqual({});
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
    expect(diff(oldLock, newLock, true)).toEqual({ express: ['4.18.0', '4.18.2'] });
  });
});
