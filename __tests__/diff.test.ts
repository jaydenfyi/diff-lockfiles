import { diff } from '../src/diff.js';
import { change } from './helpers.js';
import { pkg } from './helpers.js';

describe('diff scope', () => {
  it('marks direct deps "direct" and everything else "transitive" in one pass', () => {
    const oldLock = {
      packages: {
        express: pkg('express', '4.18.0', 'express', true), // direct, changed
        accepts: pkg('accepts', '1.3.7'), // transitive, changed
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
    expect(diff(oldLock, newLock, false)).toEqual({
      express: change('4.18.0', '4.18.2', 'direct'),
      accepts: change('1.3.7', '1.3.8', 'transitive'),
    });
  });

  it('without direct info, everything is transitive', () => {
    const oldLock = { packages: { foo: pkg('foo', '1.0.0') } };
    const newLock = { packages: { foo: pkg('foo', '1.1.0') } };
    expect(diff(oldLock, newLock, false)).toEqual({
      foo: change('1.0.0', '1.1.0', 'transitive'),
    });
  });
});
