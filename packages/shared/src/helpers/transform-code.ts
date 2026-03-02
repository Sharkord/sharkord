// Sentinel used to normalize <br> tags during processing
const BR = '\u0000BR\u0000';

/**
 * Transforms markdown-style code syntax in TipTap HTML output into proper HTML
 * code elements. Should be called before sending the message to the server.
 *
 * - Triple backticks (```lang ... ```) → <pre><code class="language-lang">...</code></pre>
 * - Single backticks (`text`) → <code>text</code>
 */
const transformMarkdown = (html: string): string => {
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

  // Transform inline code and markdown links (skip content inside <pre>/<code> tags)
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
      // Inline code
      let transformed = part.replace(/`([^`\n]+)`/g, '<code>$1</code>');
      // Markdown links: [text](url)
      transformed = transformed.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );
      return transformed;
    })
    .join('');

  return result;
};

/**
 * Reverses code HTML back to markdown backtick syntax.
 * Used when loading stored messages into the TipTap editor for editing.
 *
 * - <pre><code class="language-lang">...</code></pre> → ```lang\n...\n```
 * - <code>text</code> → `text`
 */
const reverseMarkdown = (html: string): string => {
  let result = html;

  // Reverse code blocks: <pre><code class="language-lang">code</code></pre> → ```lang<br>code<br>```
  result = result.replace(
    /<pre[^>]*>\s*<code(?:\s+class="language-(\w+)")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, lang: string | undefined, code: string) => {
      const langStr = lang || '';
      const codeWithBr = code.replace(/\n/g, '<br>');
      return `\`\`\`${langStr}<br>${codeWithBr}<br>\`\`\``;
    }
  );

  // Reverse inline code: <code>text</code> → `text`
  result = result.replace(
    /<code[^>]*>([\s\S]*?)<\/code>/gi,
    (_, text: string) => `\`${text}\``
  );

  // Reverse markdown links: <a href="url">text</a> → [text](url)
  result = result.replace(
    /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href: string, text: string) => `[${text}](${href})`
  );

  return result;
};

export { transformMarkdown, reverseMarkdown };
