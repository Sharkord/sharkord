import { describe, expect, test } from 'bun:test';
import { stripZalgo } from '../strip-zalgo';

// helper: builds a zalgo char by stacking N combining marks on a base
const zalgoChar = (base: string, count: number) =>
  base + '\u0300'.repeat(count);

describe('strip-zalgo', () => {
  test('should return plain ASCII text unchanged', () => {
    expect(stripZalgo('Hello world')).toBe('Hello world');
  });

  test('should preserve normal accented characters', () => {
    expect(stripZalgo('café')).toBe('café');
    expect(stripZalgo('résumé')).toBe('résumé');
    expect(stripZalgo('naïve')).toBe('naïve');
    expect(stripZalgo('señor')).toBe('señor');
  });

  test('should preserve up to 3 combining marks per character', () => {
    const input = zalgoChar('a', 3);

    expect(stripZalgo(input)).toBe(input);
  });

  test('should strip combining marks beyond the limit', () => {
    const input = zalgoChar('a', 10);
    const expected = zalgoChar('a', 3);

    expect(stripZalgo(input)).toBe(expected);
  });

  test('should clean heavily zalgo-ified text', () => {
    const input = zalgoChar('H', 20) + zalgoChar('i', 20);
    const expected = zalgoChar('H', 3) + zalgoChar('i', 3);

    expect(stripZalgo(input)).toBe(expected);
  });

  test('should handle mixed zalgo and clean characters', () => {
    const input = zalgoChar('H', 15) + 'ello';
    const expected = zalgoChar('H', 3) + 'ello';

    expect(stripZalgo(input)).toBe(expected);
  });

  test('should handle empty string', () => {
    expect(stripZalgo('')).toBe('');
  });

  test('should handle string with only combining marks (no base)', () => {
    // leading combiners with no base char — still capped
    const input = '\u0300'.repeat(10);

    // the first combiner has no base, the regex treats the first one as "base"
    // followed by the rest as combiners — caps to 3 combiners after it
    expect(stripZalgo(input).length).toBeLessThanOrEqual(4);
  });

  test('should handle multiple combining mark ranges', () => {
    // mix of different combining character blocks
    const input = 'a\u0300\u0489\u1DC0\u20D0\uFE20\u0301\u0302\u0303';
    const result = stripZalgo(input);

    // base 'a' + 3 combiners kept
    expect([...result].length).toBe(4);
  });

  test('should preserve emoji and non-Latin scripts', () => {
    expect(stripZalgo('こんにちは')).toBe('こんにちは');
    expect(stripZalgo('مرحبا')).toBe('مرحبا');
  });

  test('should handle HTML content with zalgo inside text nodes', () => {
    const input = `<p>${zalgoChar('H', 20)}ello</p>`;
    const expected = `<p>${zalgoChar('H', 3)}ello</p>`;

    expect(stripZalgo(input)).toBe(expected);
  });

  test('should not corrupt HTML tags', () => {
    const input = '<a href="https://example.com">link</a>';

    expect(stripZalgo(input)).toBe(input);
  });

  test('should handle very long strings efficiently', () => {
    const longZalgo =
      zalgoChar('A', 10) + 'B'.repeat(1000) + zalgoChar('C', 10);
    const expected = zalgoChar('A', 3) + 'B'.repeat(1000) + zalgoChar('C', 3);

    expect(stripZalgo(longZalgo)).toBe(expected);
  });

  test('should handle strings with no base characters but many combiners', () => {
    const input = '\u0300'.repeat(10); // 10 combiners, no base
    const expected = '\u0300'.repeat(3); // should keep at most 3 combiners

    expect(stripZalgo(input)).toBe(expected);
  });

  test('should handle actual zalgo text', () => {
    const input = 't̵̢̨̨̧̧̡̧̹̥̦̠̠͚̫̹̦̺͈̠̲̖̝̯͎̬͔͎͉̪͇̩̙͛̅̌͜͜e̴̛̞̣͇̲̫̺̟̅̑͋̓͂͊ş̶̢͉̣͚͈̖̗͚̞̦̠̲̮̖̥̏́̎́͛̿̄͌̃̽̍́͑̽͊̐͜t̵̨̳͉̭̝͚͙̺͎̲̠̝̻̖̯̩̋͊̄̈́̀̀͆̃͒͌̎̃̑̍̓̅̒̅̐̉͂͒͂̚͘̚͜͝ͅ';
    const expected = 'test';

    expect(stripZalgo(input)).toBe(expected);
  });
});
