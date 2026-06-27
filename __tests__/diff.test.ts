import { diff } from '../src/diff.js';
import { change } from './helpers.js';

describe('diff scope', () => {
  it('marks direct deps "direct" and everything else "transitive" in one pass', () => {
    const oldLock = {
      packages: {
        express: { version: '4.18.0' }, // direct, changed
        accepts: { version: '1.3.7' }, // transitive, changed
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
    expect(diff(oldLock, newLock, false)).toEqual({
      express: change('4.18.0', '4.18.2', 'direct'),
      accepts: change('1.3.7', '1.3.8', 'transitive'),
    });
  });

  it('without directDependencyKeys, everything is transitive', () => {
    const oldLock = { packages: { foo: { version: '1.0.0' } } };
    const newLock = { packages: { foo: { version: '1.1.0' } } };
    expect(diff(oldLock, newLock, false)).toEqual({
      foo: change('1.0.0', '1.1.0', 'transitive'),
    });
  });
});
