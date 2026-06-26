import { diff } from '../src/index.js';

describe('diff', () => {
  it('returns an empty object when given two empty objects', () => {
    const oldLock = { packages: {} };
    const newLock = { packages: {} };
    const changes = diff(oldLock, newLock, false);
    expect(changes).toEqual({});
  });
});
