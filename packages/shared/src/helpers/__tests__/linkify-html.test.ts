import { describe, expect, test } from 'bun:test';
import { linkifyHtml } from '../linkify-html';

const link = (url: string) =>
  `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;

describe('linkify-html', () => {
  test('should linkify https:// URLs', () => {
    expect(linkifyHtml('<p>https://google.com</p>')).toBe(
      `<p>${link('https://google.com')}</p>`
    );
  });

  test('should linkify http:// URLs', () => {
    expect(linkifyHtml('<p>http://example.com</p>')).toBe(
      `<p>${link('http://example.com')}</p>`
    );
  });

  test('should NOT linkify bare domains', () => {
    expect(linkifyHtml('<p>google.com</p>')).toBe('<p>google.com</p>');
  });

  test('should NOT linkify bare domains with paths', () => {
    expect(linkifyHtml('<p>example.com/path</p>')).toBe(
      '<p>example.com/path</p>'
    );
  });

  test('should preserve existing <a> tags', () => {
    const input = '<p><a href="https://example.com">link</a></p>';
    expect(linkifyHtml(input)).toBe(input);
  });

  test('should not double-linkify URLs inside existing <a> tags', () => {
    const input =
      '<p><a href="https://example.com">https://example.com</a></p>';
    expect(linkifyHtml(input)).toBe(input);
  });

  test('should linkify URL mixed with plain text', () => {
    expect(linkifyHtml('<p>check https://google.com ok</p>')).toBe(
      `<p>check ${link('https://google.com')} ok</p>`
    );
  });

  test('should only linkify explicit URLs when mixed with bare domains', () => {
    expect(linkifyHtml('<p>check https://google.com and google.com</p>')).toBe(
      `<p>check ${link('https://google.com')} and google.com</p>`
    );
  });

  test('should linkify multiple URLs in the same text node', () => {
    expect(
      linkifyHtml('<p>https://google.com and https://github.com</p>')
    ).toBe(
      `<p>${link('https://google.com')} and ${link('https://github.com')}</p>`
    );
  });

  test('should linkify URLs with paths and query strings', () => {
    expect(linkifyHtml('<p>https://example.com/path?q=test&foo=bar</p>')).toBe(
      `<p>${link('https://example.com/path?q=test&foo=bar')}</p>`
    );
  });

  test('should return empty content unchanged', () => {
    expect(linkifyHtml('<p></p>')).toBe('<p></p>');
  });

  test('should return plain text without URLs unchanged', () => {
    expect(linkifyHtml('<p>hello world</p>')).toBe('<p>hello world</p>');
  });

  test('should handle content with no HTML tags', () => {
    expect(linkifyHtml('https://google.com')).toBe(link('https://google.com'));
  });

  test('should handle URLs across multiple paragraphs', () => {
    expect(
      linkifyHtml('<p>https://google.com</p><p>https://github.com</p>')
    ).toBe(
      `<p>${link('https://google.com')}</p><p>${link('https://github.com')}</p>`
    );
  });

  test('should handle URLs next to inline formatting tags', () => {
    expect(linkifyHtml('<p><strong>bold</strong> https://google.com</p>')).toBe(
      `<p><strong>bold</strong> ${link('https://google.com')}</p>`
    );
  });

  test('should handle URLs with fragments', () => {
    expect(linkifyHtml('<p>https://example.com/page#section</p>')).toBe(
      `<p>${link('https://example.com/page#section')}</p>`
    );
  });
});
