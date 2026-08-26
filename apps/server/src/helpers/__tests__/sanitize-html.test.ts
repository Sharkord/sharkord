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
      '<img src="https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f600.png" alt="smile" class="emoji-image">';

    expect(sanitizeMessageHtml(input)).toContain(
      'src="https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f600.png"'
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

  test('should convert <h1>-<h6> tags to <p> to preserve block structure', () => {
    expect(sanitizeMessageHtml('<h1>heading</h1>')).toBe('<p>heading</p>');
    expect(sanitizeMessageHtml('<h4>heading</h4><p>body</p>')).toBe(
      '<p>heading</p><p>body</p>'
    );
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

  test('should preserve mention <span> with data-user-id attribute', () => {
    const input =
      '<span data-type="mention" data-user-id="123" class="mention">@Username</span>';

    expect(sanitizeMessageHtml(input)).toBe(input);
  });

  test('should preserve channel reference <span> with data-channel-id attribute', () => {
    const input =
      '<span data-type="channel-reference" data-channel-id="42" class="channel-reference"></span>';

    expect(sanitizeMessageHtml(input)).toBe(input);
  });

  test('should strip arbitrary css classes from a <span>', () => {
    // the client bundle ships the whole tailwind utility set, so an unfiltered
    // class turns any message into a full screen overlay for every viewer
    const input = '<span class="fixed inset-0 z-50 bg-black">gotcha</span>';

    expect(sanitizeMessageHtml(input)).toBe('<span>gotcha</span>');
  });

  test('should keep only the known classes when they are mixed', () => {
    const input = '<span class="emoji-image fixed inset-0">mixed</span>';

    expect(sanitizeMessageHtml(input)).toBe(
      '<span class="emoji-image">mixed</span>'
    );
  });

  test('should preserve the classes the editor produces', () => {
    const cases = [
      '<span class="mention" data-type="mention" data-user-id="1">@bob</span>',
      '<img class="emoji-image" src="/public/e.png" alt="e" />',
      '<br class="hard-break" />'
    ];

    cases.forEach((input) => {
      expect(sanitizeMessageHtml(input)).toBe(input);
    });
  });

  test('should strip an off origin image src', () => {
    // every viewer would otherwise fetch a url the sender chose, which reports
    // their ip and the fact that they opened the channel
    const input = '<img src="https://tracker.example/pixel.png" alt="x" />';

    expect(sanitizeMessageHtml(input)).toBe('<img alt="x" />');
  });

  test('should keep images served from this server, as a same origin path', () => {
    const input =
      '<img src="https://my-server.test/public/emoji.png" alt="e" />';

    expect(sanitizeMessageHtml(input)).toBe(
      '<img src="/public/emoji.png" alt="e" />'
    );
  });

  test('should keep the signed url parameters when dropping the origin', () => {
    const input =
      '<img src="https://my-server.test/public/emoji.png?accessToken=abc&amp;expires=123" alt="e" />';

    expect(sanitizeMessageHtml(input)).toBe(
      '<img src="/public/emoji.png?accessToken=abc&amp;expires=123" alt="e" />'
    );
  });

  // the host cannot be verified, so it is discarded rather than trusted: the path a sender
  // controls now points back at this server instead of at one they chose
  test('should not fetch a foreign host that shapes its path like ours', () => {
    const input =
      '<img src="https://tracker.example/public/pixel.png" alt="x" />';

    expect(sanitizeMessageHtml(input)).toBe(
      '<img src="/public/pixel.png" alt="x" />'
    );
  });

  test('should keep an already relative image src', () => {
    const input = '<img src="/public/emoji.png" alt="e" />';

    expect(sanitizeMessageHtml(input)).toBe(input);
  });

  test('should force rel on links opened in a new tab', () => {
    const input = '<a href="https://example.test" target="_blank">l</a>';

    expect(sanitizeMessageHtml(input)).toBe(
      '<a href="https://example.test" target="_blank" rel="noopener noreferrer">l</a>'
    );
  });

  test('should strip event handlers from a channel reference <span>', () => {
    const input =
      '<span data-type="channel-reference" data-channel-id="42" onclick="alert(1)"></span>';

    expect(sanitizeMessageHtml(input)).toBe(
      '<span data-type="channel-reference" data-channel-id="42"></span>'
    );
  });
});
