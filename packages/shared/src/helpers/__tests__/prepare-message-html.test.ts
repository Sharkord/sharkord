import { describe, expect, test } from 'bun:test';
import {
  normalizeLineBreaks,
  prepareMessageHtml
} from '../prepare-message-html';

describe('normalizeLineBreaks', () => {
  test('trailing hard-break before </p><p> becomes an empty paragraph', () => {
    expect(
      normalizeLineBreaks(
        '<p>line one<br class="hard-break"></p><p>line two</p>'
      )
    ).toBe('<p>line one</p><p></p><p>line two</p>');
  });

  test('trailing hard-break inside <h4> before <p> becomes an empty paragraph', () => {
    expect(
      normalizeLineBreaks('<h4>heading<br class="hard-break"></h4><p>body</p>')
    ).toBe('<h4>heading</h4><p></p><p>body</p>');
  });

  test('trailing hard-break inside <div> before <blockquote> becomes an empty paragraph', () => {
    expect(
      normalizeLineBreaks(
        '<div>text<br class="hard-break"></div><blockquote>quote</blockquote>'
      )
    ).toBe('<div>text</div><p></p><blockquote>quote</blockquote>');
  });

  test('mid-paragraph hard-break is left untouched', () => {
    const input = '<p>line one<br class="hard-break">line two</p>';
    expect(normalizeLineBreaks(input)).toBe(input);
  });

  test('trailing hard-break at end of last paragraph (no following block) is left untouched', () => {
    const input = '<p>line one<br class="hard-break"></p>';
    expect(normalizeLineBreaks(input)).toBe(input);
  });

  test('multiple trailing hard-breaks across paragraphs are all normalised', () => {
    expect(
      normalizeLineBreaks(
        '<p>one<br class="hard-break"></p><p>two<br class="hard-break"></p><p>three</p>'
      )
    ).toBe('<p>one</p><p></p><p>two</p><p></p><p>three</p>');
  });

  test('hard-break with extra whitespace before closing tag still matches', () => {
    expect(
      normalizeLineBreaks(
        '<p>line one<br class="hard-break">  </p><p>line two</p>'
      )
    ).toBe('<p>line one</p><p></p><p>line two</p>');
  });

  test('content with no hard-breaks is returned unchanged', () => {
    const input = '<p>hello</p><p>world</p>';
    expect(normalizeLineBreaks(input)).toBe(input);
  });

  test('empty string is returned unchanged', () => {
    expect(normalizeLineBreaks('')).toBe('');
  });
});

describe('prepareMessageHtml', () => {
  test('normalizes trailing hard-break and linkifies in a single call', () => {
    expect(
      prepareMessageHtml(
        '<p>see https://example.com<br class="hard-break"></p><p>next</p>'
      )
    ).toBe(
      '<p>see <a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a></p><p></p><p>next</p>'
    );
  });

  test('normalization runs before linkification', () => {
    // if order were reversed, linkify would wrap text nodes and the br regex
    // would never match the now-fragmented html
    const input = '<p>text<br class="hard-break"></p><p>more</p>';
    const result = prepareMessageHtml(input);

    expect(result).toContain('<p></p>');
  });

  test('passes through content with neither hard-breaks nor urls unchanged', () => {
    const input = '<p>hello world</p>';
    expect(prepareMessageHtml(input)).toBe(input);
  });
});
