import { describe, expect, test } from 'bun:test';
import { sanitizeMessageHtml } from '../sanitize-html';

describe('sanitize-html', () => {
  test('should preserve <p> tags', () => {
    expect(sanitizeMessageHtml('<p>hello</p>')).toBe('<p>hello</p>');
  });

  test('should preserve <br> tags', () => {
    expect(sanitizeMessageHtml('<p>line1<br>line2</p>')).toBe(
      '<p>line1<br />line2</p>'
    );
  });

  test('should preserve inline formatting tags', () => {
    expect(sanitizeMessageHtml('<strong>bold</strong>')).toBe(
      '<strong>bold</strong>'
    );
    expect(sanitizeMessageHtml('<em>italic</em>')).toBe('<em>italic</em>');
    expect(sanitizeMessageHtml('<code>code</code>')).toBe('<code>code</code>');
    expect(sanitizeMessageHtml('<pre>preformatted</pre>')).toBe(
      '<pre>preformatted</pre>'
    );
  });

  test('should preserve <a> tags with allowed attributes', () => {
    const input =
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>';
    expect(sanitizeMessageHtml(input)).toBe(input);
  });

  test('should preserve emoji <span> with allowed attributes', () => {
    const input =
      '<span data-type="emoji" data-name="smile" class="emoji-image"></span>';

    expect(sanitizeMessageHtml(input)).toBe(input);
  });

  test('should preserve emoji <img> with allowed attributes', () => {
    const input =
      '<img src="https://cdn.example.com/emoji.png" alt="smile" class="emoji-image">';

    expect(sanitizeMessageHtml(input)).toContain(
      'src="https://cdn.example.com/emoji.png"'
    );
    expect(sanitizeMessageHtml(input)).toContain('alt="smile"');
  });

  test('should strip <script> tags', () => {
    expect(sanitizeMessageHtml('<script>alert("xss")</script>')).toBe('');
  });

  test('should strip <style> tags', () => {
    expect(sanitizeMessageHtml('<style>body{color:red}</style>')).toBe('');
  });

  test('should strip <div> tags but keep content', () => {
    expect(sanitizeMessageHtml('<div>content</div>')).toBe('content');
  });

  test('should strip <iframe> tags', () => {
    expect(
      sanitizeMessageHtml('<iframe src="https://evil.com"></iframe>')
    ).toBe('');
  });

  test('should strip <h1>-<h6> tags but keep content', () => {
    expect(sanitizeMessageHtml('<h1>heading</h1>')).toBe('heading');
  });

  test('should strip event handler attributes', () => {
    expect(sanitizeMessageHtml('<p onclick="alert(1)">text</p>')).toBe(
      '<p>text</p>'
    );
  });

  test('should strip style attributes', () => {
    expect(sanitizeMessageHtml('<p style="color:red">text</p>')).toBe(
      '<p>text</p>'
    );
  });

  test('should strip disallowed attributes from <a> tags', () => {
    const input = '<a href="https://example.com" onclick="alert(1)">link</a>';
    expect(sanitizeMessageHtml(input)).toBe(
      '<a href="https://example.com">link</a>'
    );
  });

  test('should allow http:// and https:// schemes in links', () => {
    expect(sanitizeMessageHtml('<a href="http://example.com">http</a>')).toBe(
      '<a href="http://example.com">http</a>'
    );
    expect(sanitizeMessageHtml('<a href="https://example.com">https</a>')).toBe(
      '<a href="https://example.com">https</a>'
    );
  });

  test('should allow mailto: scheme in links', () => {
    expect(
      sanitizeMessageHtml('<a href="mailto:user@example.com">email</a>')
    ).toBe('<a href="mailto:user@example.com">email</a>');
  });

  test('should strip javascript: scheme from links', () => {
    const result = sanitizeMessageHtml(
      '<a href="javascript:alert(1)">click</a>'
    );
    expect(result).not.toContain('javascript:');
  });

  const zalgoChar = (base: string, count: number) =>
    base + '\u0300'.repeat(count);

  test('should strip zalgo text from content', () => {
    const input = `<p>${zalgoChar('H', 20)}ello</p>`;
    const result = sanitizeMessageHtml(input);

    expect(result.length).toBeLessThan(input.length);
    expect(result).toContain('H');
    expect(result).toContain('ello');
  });

  test('should preserve normal accented text', () => {
    expect(sanitizeMessageHtml('<p>café résumé</p>')).toBe(
      '<p>café résumé</p>'
    );
  });

  test('should handle nested allowed tags', () => {
    const input = '<p><strong><em>bold italic</em></strong></p>';

    expect(sanitizeMessageHtml(input)).toBe(input);
  });

  test('should handle mixed allowed and disallowed tags', () => {
    expect(
      sanitizeMessageHtml('<p>text</p><div>stripped</div><script>evil</script>')
    ).toBe('<p>text</p>stripped');
  });

  test('should handle empty input', () => {
    expect(sanitizeMessageHtml('')).toBe('');
  });

  test('should handle plain text without tags', () => {
    expect(sanitizeMessageHtml('just text')).toBe('just text');
  });
});
