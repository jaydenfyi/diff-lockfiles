import { parseJsonc } from '../../src/formats/jsonc.js';

describe('parseJsonc', () => {
  it('parses plain JSON', () => {
    expect(parseJsonc('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses trailing commas', () => {
    expect(parseJsonc('{"a":1,}')).toEqual({ a: 1 });
    expect(parseJsonc('[1,2,]')).toEqual([1, 2]);
  });

  it('parses line comments', () => {
    expect(parseJsonc('{\n // hi\n "a": 1\n}')).toEqual({ a: 1 });
  });

  it('parses block comments', () => {
    expect(parseJsonc('{"a": /* x */ 1}')).toEqual({ a: 1 });
  });

  it('does NOT treat // inside strings as a comment', () => {
    // registry URLs contain "//" — a naive regex stripper would corrupt this
    expect(parseJsonc('{"url":"https://registry.npmjs.org/foo"}')).toEqual({
      url: 'https://registry.npmjs.org/foo',
    });
  });
});
