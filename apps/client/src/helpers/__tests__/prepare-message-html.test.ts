import { describe, expect, test } from 'bun:test';
import { prepareMessageHtml } from '../prepare-message-html';

// prepareMessageHtml receives tiptap html (paragraphs containing markdown
// syntax as literal text) and renders it to display html via marked

describe('prepareMessageHtml', () => {
  test('empty string returns empty string', () => {
    expect(prepareMessageHtml('')).toBe('');
  });

  test('plain paragraph passes through', () => {
    expect(prepareMessageHtml('<p>hello world</p>')).toContain('hello world');
  });

  test('markdown heading in paragraph renders as h1', () => {
    expect(prepareMessageHtml('<p># my heading</p>')).toContain(
      '<h1>my heading</h1>'
    );
  });

  test('bold markdown renders as strong', () => {
    expect(prepareMessageHtml('<p>**hello** world</p>')).toContain(
      '<strong>hello</strong>'
    );
  });

  test('italic markdown renders as em', () => {
    expect(prepareMessageHtml('<p>_hello_ world</p>')).toContain(
      '<em>hello</em>'
    );
  });

  test('bare url is linkified', () => {
    expect(prepareMessageHtml('<p>see https://example.com</p>')).toContain(
      '<a href="https://example.com"'
    );
  });

  test('user-typed html angle brackets are escaped by tiptap and stay escaped', () => {
    // tiptap escapes < to &lt; in text nodes before getHTML()
    expect(prepareMessageHtml('<p>I like &lt;p&gt; tags</p>')).toContain(
      '&lt;p&gt;'
    );
  });

  test('emoji spans pass through to output', () => {
    const span =
      '<span data-type="emoji" data-name="thumbsup" class="emoji-image">:thumbsup:</span>';
    expect(prepareMessageHtml(`<p>hello ${span}</p>`)).toContain(span);
  });

  test('multiple paragraphs render as separate blocks', () => {
    const result = prepareMessageHtml('<p>one</p><p>two</p>');
    expect(result).toContain('one');
    expect(result).toContain('two');
  });
});
