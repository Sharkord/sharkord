// Sentinel used to normalize <br> tags during processing
const BR = '\u0000BR\u0000';

/**
 * Transforms markdown-style code syntax in TipTap HTML output into proper HTML
 * code elements. Should be called before sending the message to the server.
 *
 * - Triple backticks (```lang ... ```) → <pre><code class="language-lang">...</code></pre>
 * - Single backticks (`text`) → <code>text</code>
 */
const transformMarkdownCode = (html: string): string => {
  let result = html;

  // Normalize all <br> variants to a sentinel for easier matching
  result = result.replace(/<br\s*(?:class="[^"]*")?\s*\/?>/gi, BR);

  // Transform code blocks: ```lang<BR>code<BR>```
  result = result.replace(
    new RegExp('```(\\w*)' + BR + '([\\s\\S]*?)' + BR + '```', 'g'),
    (_, lang: string, code: string) => {
      const langAttr = lang ? ` class="language-${lang}"` : '';
      const cleanCode = code.split(BR).join('\n').trim();
      return `<pre><code${langAttr}>${cleanCode}</code></pre>`;
    }
  );

  // Restore remaining sentinels back to <br>
  result = result.split(BR).join('<br>');

  // Transform inline code: `text` (skip content inside <pre>/<code> tags)
  let insidePre = false;
  let insideCode = false;
  const parts = result.split(/(<[^>]+>)/);
  result = parts
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<pre[\s>]/i.test(part)) insidePre = true;
        else if (/^<\/pre>/i.test(part)) insidePre = false;
        if (/^<code[\s>]/i.test(part)) insideCode = true;
        else if (/^<\/code>/i.test(part)) insideCode = false;
        return part;
      }
      if (insidePre || insideCode) return part;
      return part.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    })
    .join('');

  return result;
};

export { transformMarkdownCode };
